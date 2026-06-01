// ==========================================
// WEDDINGHUB - MOTOR COM SUPABASE v2.1 (CORRIGIDO)
// ==========================================

// ⚠️ SUBSTITUA PELOS SEUS DADOS DO PAINEL DO SUPABASE:
const SUPABASE_URL = "https://fncbdfljmidoewlwakkt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuY2JkZmxqbWlkb2V3bHdha2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzI4NTAsImV4cCI6MjA5NTE0ODg1MH0.jW2qvsNe-WTfs77-hoZrDVHqnhGFx4jgkkQ9VloLuV0";

// Mudamos o nome para evitar conflito com a biblioteca global
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Arrays que vão guardar os dados vindos do banco de dados
let fornecedores = [];
let historicoDepositos = [];

// ================= FUNÇÕES DE CARREGAMENTO (READ) =================
async function carregarDadosDoBanco() {
    try {
        // Busca Fornecedores
        let { data: fornData, error: fornErr } = await supabaseClient.from('fornecedores').select('*').order('id', { ascending: true });
        if (fornErr) throw fornErr;
        fornecedores = fornData;

        // Busca Depósitos
        let { data: depData, error: depErr } = await supabaseClient.from('historico_depositos').select('*').order('id', { ascending: true });
        if (depErr) throw depErr;
        historicoDepositos = depData;

        // Renderiza na tela após carregar tudo
        renderizarSistema();
    } catch (error) {
        console.error("Erro ao carregar dados do Supabase:", error.message);
        alert("Erro ao conectar com o banco de dados. Verifique suas credenciais.");
    }
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
    let totalCusto = fornecedores.reduce((acc, f) => acc + (Number(f.valor) || 0), 0);
    let totalPago = fornecedores.reduce((acc, f) => acc + (Number(f.pago) || 0), 0);
    let totalAberto = totalCusto - totalPago;

    let totalCaixa = historicoDepositos.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);

    const mesesRestantes = 3; 
    let deficitFaltante = totalAberto - totalCaixa;
    let aporteMensalNecessario = deficitFaltante > 0 ? (deficitFaltante / mesesRestantes) : 0;

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
            let saldoRestante = (Number(f.valor) || 0) - (Number(f.pago) || 0);
            tabelaForn.innerHTML += `
                <tr class="border-b border-slate-200 dark:border-slate-800/60 text-sm hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                    <td class="py-3 font-semibold text-slate-800 dark:text-slate-200">${f.nome}</td>
                    <td class="py-3 text-slate-500 dark:text-slate-400 text-xs">${f.servico}</td>
                    <td class="py-3 text-right">
                        <input type="number" value="${f.valor}" onchange="editarFornecedor(${f.id}, 'valor', this.value)" class="w-20 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-slate-950/40 dark:text-slate-200 dark:border-slate-800 text-right rounded px-1.5 py-0.5 focus:outline-none focus:border-purple-500">
                    </td>
                    <td class="py-3 text-right">
                        <input type="number" value="${f.pago}" onchange="editarFornecedor(${f.id}, 'pago', this.value)" class="w-20 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-slate-950/40 dark:text-emerald-400 dark:border-slate-800 text-right rounded px-1.5 py-0.5 text-emerald-600 font-medium focus:outline-none focus:border-purple-500">
                    </td>
                    <td class="py-3 text-right font-bold ${saldoRestante > 0 ? 'text-slate-600 dark:text-slate-400' : 'text-emerald-600 dark:text-emerald-500'} pr-2">${formatarMoeda(saldoRestante)}</td>
                    <td class="py-3 text-center">
                        <button onclick="removerFornecedor(${f.id})" class="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors text-xs font-medium">Excluir</button>
                    </td>
                </tr>`;
        });
    }

    // Renderização do Histórico de Depósitos
    const tabelaDep = document.getElementById('tabela-historico-depositos');
    if (tabelaDep) {
        tabelaDep.innerHTML = '';
        historicoDepositos.slice().reverse().forEach(d => {
            tabelaDep.innerHTML += `
                <tr class="border-b border-slate-200 dark:border-slate-800/40 text-xs hover:bg-slate-50 dark:hover:bg-slate-900/20">
                    <td class="py-2 text-slate-700 dark:text-slate-300">${formatarData(d.data)}</td>
                    <td class="py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">${formatarMoeda(d.valor)}</td>
                    <td class="py-2 text-center">
                        <button onclick="removerDeposito(${d.id})" class="text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors">Remover</button>
                    </td>
                </tr>`;
        });
    }
}

// ================= OPERAÇÕES NO SUPABASE (CREATE, UPDATE, DELETE) =================
function inicializarAcoesFornecedores() {
    const btnSalvar = document.getElementById('btn-salvar-fornecedor');
    if (!btnSalvar) return;

    btnSalvar.onclick = async () => {
        const nome = document.getElementById('add-forn-nome').value.toUpperCase();
        const servico = document.getElementById('add-forn-servico').value.toUpperCase();
        const valor = Number(document.getElementById('add-forn-valor').value) || 0;
        const pago = Number(document.getElementById('add-forn-pago').value) || 0;

        if (!nome || !servico) return alert("Por favor, informe ao menos o Nome e o Serviço!");

        // Insere no Supabase utilizando o cliente corrigido
        const { error } = await supabaseClient.from('fornecedores').insert([{ nome, servico, valor, pago }]);
        if (error) return alert("Erro ao salvar no banco: " + error.message);
        
        // Limpa campos
        document.getElementById('add-forn-nome').value = '';
        document.getElementById('add-forn-servico').value = '';
        document.getElementById('add-forn-valor').value = '';
        document.getElementById('add-forn-pago').value = '0';

        carregarDadosDoBanco();
    };
}

async function editarFornecedor(id, campo, valor) {
    let dadosAtualizados = {};
    dadosAtualizados[campo] = Number(valor) || 0;

    const { error } = await supabaseClient.from('fornecedores').update(dadosAtualizados).eq('id', id);
    if (error) alert("Erro ao atualizar valor: " + error.message);
    
    carregarDadosDoBanco();
}

async function removerFornecedor(id) {
    if (confirm("Excluir este contrato permanentemente do banco de dados?")) {
        const { error } = await supabaseClient.from('fornecedores').delete().eq('id', id);
        if (error) alert("Erro ao deletar: " + error.message);
        carregarDadosDoBanco();
    }
}

function inicializarAcoesDepositos() {
    const btnDeposito = document.getElementById('btn-salvar-deposito');
    if (!btnDeposito) return;

    btnDeposito.onclick = async () => {
        const data = document.getElementById('deposito-data').value;
        const valor = Number(document.getElementById('deposito-valor').value);

        if (!data || !valor) return alert("Insira uma data válida e o valor do depósito!");

        const { error } = await supabaseClient.from('historico_depositos').insert([{ data, valor }]);
        if (error) return alert("Erro ao registrar aporte: " + error.message);

        document.getElementById('deposito-valor').value = '';
        carregarDadosDoBanco();
    };
}

async function removerDeposito(id) {
    if (confirm("Remover este registro de aporte do banco?")) {
        const { error } = await supabaseClient.from('historico_depositos').delete().eq('id', id);
        if (error) alert("Erro ao deletar aporte: " + error.message);
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

        let totalCusto = fornecedores.reduce((acc, f) => acc + f.valor, 0);
        let totalPago = fornecedores.reduce((acc, f) => acc + f.pago, 0);
        let totalAberto = totalCusto - totalPago;

        let resposta = "Interessante! Posso analisar essa categoria para você. Lembre-se que seu maior contrato em aberto hoje é de Decoração (R$ 10.000,00 totais). Reduzir margens ali gera grande impacto.";

        if (pergunta.includes('resumo') || pergunta.includes('status')) {
            resposta = `Análise Atualizada: Seus contratos somam ${formatarMoeda(totalCusto)}. Você já liquidou ${formatarMoeda(totalPago)} e restam ${formatarMoeda(totalAberto)} para quitar até Agosto/2026.`;
        } else if (pergunta.includes('decoracao') || pergunta.includes('arlidia') || pergunta.includes('daré')) {
            resposta = "Alerta de foco: A decoração representa uma grande parte do orçamento e está com 0% pago. Recomendo usar o caixa atual para travar os valores.";
        } else if (pergunta.includes('caixa') || pergunta.includes('guardado') || pergunta.includes('aporte')) {
            let totalCaixa = historicoDepositos.reduce((acc, d) => acc + d.valor, 0);
            resposta = `Você possui ${formatarMoeda(totalCaixa)} em caixa guardado através de ${historicoDepositos.length} depósitos estruturados.`;
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

// Inicialização Conectada ao Banco de Dados
window.onload = () => {
    inicializarControleTema();
    inicializarAcoesFornecedores();
    inicializarAcoesDepositos();
    inicializarConsultorGemini();
    carregarDadosDoBanco();
};