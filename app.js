// =========================================
// WEDDINGHUB - MOTOR COM SUPABASE v3.0 (CENTRALIZADO)
// =========================================

const SUPABASE_URL = "https://fncbdfljmidoewlwakkt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuY2JkZmxqbWlkb2V3bHdha2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzI4NTAsImV4cCI6MjA5NTE0ODg1MH0.jW2qvsNe-WTfs77-hoZrDVHqnhGFx4jgkkQ9VloLuV0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Arrays globais de dados
let fornecedores = [];
let movimentacoesCaixa = []; // Antigo historicoDepositos

// ================= FUNÇÕES DE CARREGAMENTO (READ) =================
async function carregarDadosDoBanco() {
    try {
        // Busca Fornecedores
        let { data: fornData, error: fornErr } = await supabaseClient.from('fornecedores').select('*').order('id', { ascending: true });
        if (fornErr) throw fornErr;
        fornecedores = fornData;

        // Busca Movimentações de Caixa (Historico)
        let { data: depData, error: depErr } = await supabaseClient.from('historico_depositos').select('*').order('id', { ascending: true });
        if (depErr) throw depErr;
        movimentacoesCaixa = depData;

        // Atualiza os componentes dinâmicos da tela
        atualizarSelectFornecedores();
        renderizarSistema();
    } catch (error) {
        console.error("Erro ao carregar dados do Supabase:", error);
        alert("Erro interno ao processar sua solicitação. Tente novamente mais tarde.");
    }
}

// Atualiza o select da Central de Caixa com os fornecedores cadastrados
function atualizarSelectFornecedores() {
    const selectForn = document.getElementById('movimentacao-fornecedor');
    if (!selectForn) return;
    
    // Mantém apenas a primeira opção padrão
    selectForn.innerHTML = '<option value="">Selecione o fornecedor...</option>';
    
    fornecedores.forEach(f => {
        selectForn.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
    });
}

// ================= CONTROLE DE TEMA (CLARO / ESCURO) =================
function inicializarControleTema() {
    const btnTema = document.getElementById('btn-tema');
    const txtTema = document.getElementById('txt-tema');
    const htmlTag = document.documentElement;

    if (!btnTema) return;

    btnTema.addEventListener('click', () => {
        if (htmlTag.classList.contains('dark')) {
            htmlTag.classList.remove('dark');
            htmlTag.classList.add('light');
            document.body.className = "bg-slate-100 text-slate-900 min-h-screen font-sans antialiased transition-colors duration-300";
            txtTema.innerText = "Modo Noturno";
        } else {
            htmlTag.classList.remove('light');
            htmlTag.classList.add('dark');
            document.body.className = "bg-slate-950 text-slate-100 min-h-screen font-sans antialiased transition-colors duration-300";
            txtTema.innerText = "Modo Claro";
        }
        renderizarSistema();
    });
}

// ================= MOTOR DE CÁLCULO E RENDERIZAÇÃO =================
function renderizarSistema() {
    // 1. Calcular pagamentos por fornecedor a partir do histórico de saídas
    const obterTotalPagoPorFornecedor = (fornId) => {
        return movimentacoesCaixa
            .filter(m => m.tipo === 'pagamento' && Number(m.fornecedor_id) === Number(fornId))
            .reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
    };

    // 2. Cálculos Globais dos Contratos
    let totalCusto = fornecedores.reduce((acc, f) => acc + (Number(f.valor) || 0), 0);
    let totalPago = fornecedores.reduce((acc, f) => acc + obterTotalPagoPorFornecedor(f.id), 0);
    let totalAberto = totalCusto - totalPago;

    // 3. Cálculo do Dinheiro em Caixa Real (Entradas - Saídas)
    let totalCaixa = movimentacoesCaixa.reduce((acc, m) => {
        let valor = Number(m.valor) || 0;
        if (m.tipo === 'aporte') return acc + valor;      // Entrada soma
        if (m.tipo === 'pagamento' || m.tipo === 'retirada') return acc - valor; // Saídas subtraem
        return acc + valor; // Fallback para registros antigos sem a coluna tipo
    }, 0);

    // 4. Análise de Aporte Mensal (Falta Pagar vs Caixa Atual)
    const mesesRestantes = 3; 
    let deficitFaltante = totalAberto - totalCaixa;
    let aporteMensalNecessario = deficitFaltante > 0 ? (deficitFaltante / mesesRestantes) : 0;

    // Atualiza Painéis Superiores
    if(document.getElementById('resumo-custo-total')) document.getElementById('resumo-custo-total').innerText = formatarMoeda(totalCusto);
    if(document.getElementById('resumo-total-pago')) document.getElementById('resumo-total-pago').innerText = formatarMoeda(totalPago);
    if(document.getElementById('resumo-total-aberto')) document.getElementById('resumo-total-aberto').innerText = formatarMoeda(totalAberto);
    if(document.getElementById('resumo-caixa-atual')) document.getElementById('resumo-caixa-atual').innerText = formatarMoeda(totalCaixa);
    
    if(document.getElementById('analise-aporte-necessario')) {
        document.getElementById('analise-aporte-necessario').innerText = `${formatarMoeda(aporteMensalNecessario)} /mês`;
    }

    // Renderização da Tabela de Fornecedores
    const tabelaForn = document.getElementById('tabela-fornecedores');
    if (tabelaForn) {
        tabelaForn.innerHTML = '';
        fornecedores.forEach(f => {
            let pagoFornecedor = obterTotalPagoPorFornecedor(f.id);
            let saldoRestante = (Number(f.valor) || 0) - pagoFornecedor;
            
            tabelaForn.innerHTML += `
                <tr class="border-b border-slate-200 dark:border-slate-800/60 text-sm hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                    <td class="py-3 font-semibold text-slate-800 dark:text-slate-200">${f.nome}</td>
                    <td class="py-3 text-slate-500 dark:text-slate-400 text-xs">${f.servico}</td>
                    <td class="py-3 text-right text-slate-700 dark:text-slate-300 pr-4">${formatarMoeda(f.valor)}</td>
                    <td class="py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium pr-4">${formatarMoeda(pagoFornecedor)}</td>
                    <td class="py-3 text-right font-bold ${saldoRestante > 0 ? 'text-slate-600 dark:text-slate-400' : 'text-emerald-600 dark:text-emerald-500'} pr-2">${formatarMoeda(saldoRestante)}</td>
                    <td class="py-3 text-center space-x-2">
                        <button onclick="prepararEdicaoFornecedor(${f.id}, '${f.nome}', '${f.servico}', ${f.valor})" class="text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 transition-colors text-xs font-medium">Editar</button>
                        <button onclick="removerFornecedor(${f.id})" class="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors text-xs font-medium">Excluir</button>
                    </td>
                </tr>`;
        });
    }

    // Renderização do Histórico de Movimentações de Caixa
    const tabelaDep = document.getElementById('tabela-historico-depositos');
    if (tabelaDep) {
        tabelaDep.innerHTML = '';
        movimentacoesCaixa.slice().reverse().forEach(m => {
            let badgeTipo = "";
            let classeValor = "";
            let sinal = "";

            if (m.tipo === 'aporte') {
                badgeTipo = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">APORTE</span>`;
                classeValor = "text-emerald-600 dark:text-emerald-400";
                sinal = "+";
            } else if (m.tipo === 'pagamento') {
                badgeTipo = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">PAGO</span>`;
                classeValor = "text-amber-600 dark:text-amber-500";
                sinal = "-";
            } else {
                badgeTipo = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">RETIRADA</span>`;
                classeValor = "text-rose-600 dark:text-rose-400";
                sinal = "-";
            }

            let descExibida = m.descricao || (m.tipo === 'pagamento' ? 'Pagamento de Fornecedor' : 'Aporte de Caixa');

            tabelaDep.innerHTML += `
                <tr class="border-b border-slate-200 dark:border-slate-800/40 text-xs hover:bg-slate-50 dark:hover:bg-slate-900/20">
                    <td class="py-2 text-slate-700 dark:text-slate-300">${formatarData(m.data)}</td>
                    <td class="py-2">${badgeTipo}</td>
                    <td class="py-2 text-slate-500 dark:text-slate-400 max-w-[120px] truncate" title="${descExibida}">${descExibida}</td>
                    <td class="py-2 text-right font-semibold ${classeValor}">${sinal} ${formatarMoeda(m.valor)}</td>
                    <td class="py-2 text-center">
                        <button onclick="removerMovimentacao(${m.id})" class="text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors">Remover</button>
                    </td>
                </tr>`;
        });
    }
}

// ================= GESTÃO DE FORNECODORES (CREATE / UPDATE / DELETE) =================
function inicializarAcoesFornecedores() {
    const btnSalvar = document.getElementById('btn-salvar-fornecedor');
    const btnCancelar = document.getElementById('btn-cancelar-fornecedor');
    
    if (!btnSalvar) return;

    btnSalvar.onclick = async () => {
        const id = document.getElementById('forn-id').value;
        const nome = document.getElementById('add-forn-nome').value.toUpperCase();
        const servico = document.getElementById('add-forn-servico').value.toUpperCase();
        const valor = Number(document.getElementById('add-forn-valor').value) || 0;

        if (!nome || !servico) return alert("Por favor, informe ao menos o Nome e o Serviço!");

        if (id) {
            // Modo Edição (UPDATE)
            const { error } = await supabaseClient.from('fornecedores').update({ nome, servico, valor }).eq('id', id);
            if (error) {
                console.error(error);
                return alert("Erro interno ao processar sua solicitação.");
            }
        } else {
            // Modo Cadastro (INSERT)
            const { error } = await supabaseClient.from('fornecedores').insert([{ nome, servico, valor }]);
            if (error) {
                console.error(error);
                return alert("Erro interno ao processar sua solicitação.");
            }
        }

        limparFormularioFornecedor();
        carregarDadosDoBanco();
    };

    if (btnCancelar) {
        btnCancelar.onclick = () => {
            limparFormularioFornecedor();
        };
    }
}

function prepararEdicaoFornecedor(id, nome, servico, valor) {
    document.getElementById('forn-id').value = id;
    document.getElementById('add-forn-nome').value = nome;
    document.getElementById('add-forn-servico').value = servico;
    document.getElementById('add-forn-valor').value = valor;

    // Altera interface visual para Modo Edição (Opção 2)
    document.getElementById('forn-titulo-texto').innerText = "Editar Fornecedor";
    document.getElementById('forn-card-subtitulo').innerText = "Modifique as propriedades deste contrato.";
    document.getElementById('btn-forn-texto').innerText = "Salvar Alterações";
    document.getElementById('btn-cancelar-fornecedor').classList.remove('hidden');
    
    // Rola suavemente até o formulário lateral
    document.getElementById('add-forn-nome').focus();
}

function limparFormularioFornecedor() {
    document.getElementById('forn-id').value = '';
    document.getElementById('add-forn-nome').value = '';
    document.getElementById('add-forn-servico').value = '';
    document.getElementById('add-forn-valor').value = '';

    // Restaura interface visual para Modo Cadastro
    document.getElementById('forn-titulo-texto').innerText = "Novo Fornecedor";
    document.getElementById('forn-card-subtitulo').innerText = "Adicione novos contratos ou serviços à lista.";
    document.getElementById('btn-forn-texto').innerText = "Adicionar Contrato";
    if (document.getElementById('btn-cancelar-fornecedor')) {
        document.getElementById('btn-cancelar-fornecedor').classList.add('hidden');
    }
}

async function removerFornecedor(id) {
    if (confirm("Excluir este contrato permanentemente? Isso não apagará o histórico de pagamentos feitos a ele.")) {
        const { error } = await supabaseClient.from('fornecedores').delete().eq('id', id);
        if (error) {
            console.error(error);
            alert("Erro interno ao processar sua solicitação.");
        }
        carregarDadosDoBanco();
    }
}

// ================= CENTRAL DE MOVIMENTAÇÕES DE CAIXA =================
function inicializarAcoesMovimentacoes() {
    const selectTipo = document.getElementById('movimentacao-tipo');
    const selectForn = document.getElementById('movimentacao-fornecedor');
    const btnSalvarMov = document.getElementById('btn-salvar-deposito');

    if (!selectTipo || !selectForn || !btnSalvarMov) return;

    // Escuta a alteração do tipo de movimentação para habilitar/desabilitar vinculo
    selectTipo.addEventListener('change', () => {
        if (selectTipo.value === 'pagamento') {
            selectForn.removeAttribute('disabled');
            selectForn.className = "w-full bg-slate-50 text-slate-900 border border-slate-300 dark:bg-slate-950 dark:text-white dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors";
        } else {
            selectForn.setAttribute('disabled', 'true');
            selectForn.value = "";
            selectForn.className = "w-full bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-900 dark:text-slate-600 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors";
        }
    });

    btnSalvarMov.onclick = async () => {
        const tipo = selectTipo.value;
        const data = document.getElementById('deposito-data').value;
        const descricao = document.getElementById('deposito-descricao').value;
        const fornecedorId = selectForn.value;
        const valor = Number(document.getElementById('deposito-valor').value);

        if (!data || !valor) return alert("Insira uma data válida e o valor da movimentação!");
        if (tipo === 'pagamento' && !fornecedorId) return alert("Para lançar um pagamento, selecione qual fornecedor está recebendo!");

        // Preparação do objeto para o Supabase
        const payload = { 
            data, 
            valor, 
            tipo, 
            descricao: descricao || (tipo === 'pagamento' ? 'Pagamento' : tipo === 'aporte' ? 'Aporte' : 'Retirada'),
            fornecedor_id: tipo === 'pagamento' ? Number(fornecedorId) : null
        };

        // Insere na tabela 'historico_depositos' do seu Supabase
        const { error } = await supabaseClient.from('historico_depositos').insert([payload]);
        if (error) {
            console.error(error);
            return alert("Erro interno ao processar sua solicitação.");
        }

        // Limpa inputs
        document.getElementById('deposito-descricao').value = '';
        document.getElementById('deposito-valor').value = '';
        selectForn.value = '';

        carregarDadosDoBanco();
    };
}

async function removerMovimentacao(id) {
    if (confirm("Remover permanentemente este registro de movimentação do caixa?")) {
        const { error } = await supabaseClient.from('historico_depositos').delete().eq('id', id);
        if (error) {
            console.error(error);
            alert("Erro interno ao processar sua solicitação.");
        }
        carregarDadosDoBanco();
    }
}

// ================= MINI CONSULTOR GEMINI AI INTERATIVO =================
function inicializarConsultorGemini() {
    const btnPerguntar = document.getElementById('btn-perguntar-gemini');
    const inputGemini = document.getElementById('gemini-input');
    const chatArea = document.getElementById('gemini-chat-area');

    if (!btnPerguntar || !inputGemini || !chatArea) return;

    btnPerguntar.onclick = () => {
        const pergunta = inputGemini.value.trim().toLowerCase();
        if (!pergunta) return;

        let totalCusto = fornecedores.reduce((acc, f) => acc + (Number(f.valor) || 0), 0);
        
        let totalPago = movimentacoesCaixa
            .filter(m => m.tipo === 'pagamento')
            .reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
            
        let totalAberto = totalCusto - totalPago;
        let totalCaixa = movimentacoesCaixa.reduce((acc, m) => {
            let v = Number(m.valor) || 0;
            return m.tipo === 'aporte' ? acc + v : (m.tipo === 'pagamento' || m.tipo === 'retirada') ? acc - v : acc + v;
        }, 0);

        let resposta = "Posso te ajudar a analisar os dados do caixa. Pergunte por 'resumo', 'saldo' ou 'caixa' para obter métricas em tempo real.";

        if (pergunta.includes('resumo') || pergunta.includes('status')) {
            resposta = `Análise Atualizada: Seus contratos somam ${formatarMoeda(totalCusto)}. Liquidado via caixa: ${formatarMoeda(totalPago)}. Restam ${formatarMoeda(totalAberto)} pendentes.`;
        } else if (pergunta.includes('caixa') || pergunta.includes('guardado') || pergunta.includes('saldo')) {
            resposta = `O saldo líquido atual do seu Dinheiro em Caixa é ${formatarMoeda(totalCaixa)}, considerando aportes e saídas computadas.`;
        } else if (pergunta.includes('decoracao') || pergunta.includes('arlidia')) {
            resposta = "Alerta: Verifique o saldo pendente do contrato de Decoração diretamente na sua lista atualizada.";
        }

        chatArea.innerHTML = `<strong>Você:</strong> ${inputGemini.value}<br><br><strong class="text-purple-600 dark:text-purple-400">Gemini:</strong> ${resposta}`;
        inputGemini.value = '';
        chatArea.scrollTop = chatArea.scrollHeight;
    };

    inputGemini.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnPerguntar.click();
    });
}

// ================= UTILITÁRIOS DE FORMATAÇÃO =================
function formatarMoeda(valor) {
    return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataString) {
    if (!dataString) return "";
    const partes = dataString.split('-');
    if (partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Inicialização Centralizada
window.onload = () => {
    inicializarControleTema();
    inicializarAcoesFornecedores();
    inicializarAcoesMovimentacoes(); // Antiga inicializarAcoesDepositos
    inicializarConsultorGemini();
    carregarDadosDoBanco();
};
