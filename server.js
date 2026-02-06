const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const cors = require('cors'); // Opcional, mas boa prática

app.use(express.json());
app.use(express.static('public'));

const db = new sqlite3.Database('tarefas.db');

// Cria tabela se não existir
db.run(`
CREATE TABLE IF NOT EXISTS tarefas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL,
    custo REAL NOT NULL,
    data_limite TEXT NOT NULL,
    ordem INTEGER NOT NULL
)`);

// --- ROTAS ---

// 1. LISTAR TODAS
app.get('/tarefas', (req, res) => {
    db.all("SELECT * FROM tarefas ORDER BY ordem", [], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

// 2. ADICIONAR NOVA
app.post('/tarefas', (req, res) => {
    const { nome, custo, data_limite } = req.body;

    db.get("SELECT MAX(ordem) as max FROM tarefas", [], (err, row) => {
        if (err) return res.status(500).json(err);
        const ordem = (row.max || 0) + 1;

        db.run(
            "INSERT INTO tarefas (nome, custo, data_limite, ordem) VALUES (?, ?, ?, ?)",
            [nome, custo, data_limite, ordem],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: "Nome da tarefa já existe." });
                    }
                    return res.status(500).json(err);
                }
                res.json({ id: this.lastID });
            }
        );
    });
});

// 3. EDITAR TAREFA (ATUALIZAR DADOS)
app.put('/tarefas/:id', (req, res) => {
    const { nome, custo, data_limite } = req.body;
    const id = req.params.id;

    db.run(
        "UPDATE tarefas SET nome = ?, custo = ?, data_limite = ? WHERE id = ?",
        [nome, custo, data_limite, id],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: "Nome da tarefa já existe." });
                }
                return res.status(500).json(err);
            }
            res.json({ changes: this.changes });
        }
    );
});

// 4. EXCLUIR TAREFA
app.delete('/tarefas/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM tarefas WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json(err);
        res.json({ changes: this.changes });
    });
});

// 5. REORDENAR (SALVAR NOVA ORDEM)
app.put('/tarefas/reordenar', (req, res) => {
    const novasOrdens = req.body; // Array [{id: 1, ordem: 1}, ...]

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare("UPDATE tarefas SET ordem = ? WHERE id = ?");
        
        try {
            novasOrdens.forEach(t => stmt.run(t.ordem, t.id));
            stmt.finalize();
            db.run("COMMIT", () => res.json({ ok: true }));
        } catch (e) {
            db.run("ROLLBACK");
            res.status(500).json({ error: e.message });
        }
    });
});

app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});