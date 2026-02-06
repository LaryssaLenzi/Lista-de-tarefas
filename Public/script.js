let listaTarefasAtual = [];

//Mostra Tarefas
async function carregarTarefas() {
    try {
        const res = await fetch('/tarefas');
        listaTarefasAtual = await res.json();
        renderizarTabela();
    } catch (error) {
        console.error("Erro ao carregar:", error);
    }
}

function renderizarTabela() {
    const tbody = document.getElementById('lista-tarefas');
    tbody.innerHTML = '';
    let total = 0;

    listaTarefasAtual.forEach((tarefa, index) => {
        const tr = document.createElement('tr');
        
       
        tr.setAttribute('draggable', true);
        tr.dataset.index = index;
        adicionarEventosDrag(tr);

        if (tarefa.custo >= 1000) tr.classList.add('caro');

        // Botões de subir/descer
        const disableUp = index === 0 ? 'disabled' : '';
        const disableDown = index === listaTarefasAtual.length - 1 ? 'disabled' : '';

        tr.innerHTML = `
            <td>${tarefa.nome}</td>
            <td>R$ ${Number(tarefa.custo).toFixed(2).replace('.', ',')}</td>
            <td>${formatarData(tarefa.data_limite)}</td>
            <td class="acoes-col">
                <button class="btn-acao btn-edit" style="border: solid black 1px" onclick="prepararEdicao(${tarefa.id})" title="Editar">✏️</button>
                
                <button class="btn-acao btn-del" style="border: solid black 1px" onclick="excluirTarefa(${tarefa.id})" title="Excluir">🗑️</button>
                
                <span class="separador">|</span>

                <button class="btn-acao" onclick="moverTarefa(${index}, -1)" ${disableUp}>⬆️</button>
                <button class="btn-acao" onclick="moverTarefa(${index}, 1)" ${disableDown}>⬇️</button>
            </td>
        `;

        total += Number(tarefa.custo);
        tbody.appendChild(tr);
    });

    document.getElementById('total').innerText = "Total: R$ " + total.toFixed(2).replace('.', ',');
}

// --- ADICIONAR E EDITAR ---

// Abre o form vazio
function abrirFormulario() {
    document.getElementById('titulo-form').innerText = "Nova Tarefa";
    document.getElementById('id-tarefa').value = ""; // Limpa ID
    document.getElementById('nome').value = "";
    document.getElementById('custo').value = "";
    document.getElementById('data_limite').value = "";
    document.getElementById('formulario').style.display = 'block';
}

// Abre o form preenchido com dados da tarefa
function prepararEdicao(id) {
    const tarefa = listaTarefasAtual.find(t => t.id === id);
    if (!tarefa) return;

    document.getElementById('titulo-form').innerText = "Editar Tarefa";
    document.getElementById('id-tarefa').value = tarefa.id; // Define ID
    document.getElementById('nome').value = tarefa.nome;
    document.getElementById('custo').value = tarefa.custo;
    document.getElementById('data_limite').value = tarefa.data_limite;
    
    document.getElementById('formulario').style.display = 'block';
}

function fecharFormulario() {
    document.getElementById('formulario').style.display = 'none';
}

async function salvarTarefa() {
    const id = document.getElementById('id-tarefa').value;
    const nome = document.getElementById('nome').value;
    const custo = document.getElementById('custo').value;
    const data_limite = document.getElementById('data_limite').value;

    if (!nome || !custo || !data_limite) return alert("Preencha todos os campos!");

    const dados = { nome, custo, data_limite };
    let url = '/tarefas';
    let method = 'POST';

    // Se tem ID, é Edição (PUT), senão é Criação (POST)
    if (id) {
        url = `/tarefas/${id}`;
        method = 'PUT';
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resposta = await res.json();

        if (res.ok) {
            fecharFormulario();
            carregarTarefas();
        } else {
            alert("Erro: " + (resposta.error || "Falha ao salvar"));
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    }
}

// --- EXCLUIR ---
async function excluirTarefa(id) {
    if (confirm("Tem certeza que deseja excluir?")) {
        await fetch(`/tarefas/${id}`, { method: 'DELETE' });
        carregarTarefas();
    }
}

// --- REORDENAÇÃO (Botões e Drag-and-Drop) ---

async function moverTarefa(indexAtual, direcao) {
    const indexNovo = indexAtual + direcao;
    if (indexNovo < 0 || indexNovo >= listaTarefasAtual.length) return;
    
    trocarItens(indexAtual, indexNovo);
}

// Lógica de Drag-and-Drop
let dragStartIndex;
function adicionarEventosDrag(row) {
    row.addEventListener('dragstart', () => {
        dragStartIndex = +row.dataset.index;
        row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        document.querySelectorAll('tr').forEach(tr => tr.classList.remove('drag-over'));
    });
    row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    });
    row.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
    row.addEventListener('drop', (e) => {
        const dragEndIndex = +e.currentTarget.dataset.index;
        if (dragStartIndex !== dragEndIndex) trocarItens(dragStartIndex, dragEndIndex);
    });
}

async function trocarItens(fromIndex, toIndex) {
    const itemMovido = listaTarefasAtual[fromIndex];
    listaTarefasAtual.splice(fromIndex, 1);
    listaTarefasAtual.splice(toIndex, 0, itemMovido);

    renderizarTabela();
    
    // Salva nova ordem no banco
    const payload = listaTarefasAtual.map((t, i) => ({ id: t.id, ordem: i + 1 }));
    await fetch('/tarefas/reordenar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

// --- UTILITÁRIOS ---
function formatarData(dataIso) {
    if (!dataIso) return '-';
    const p = dataIso.split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
}

// Inicia
carregarTarefas();