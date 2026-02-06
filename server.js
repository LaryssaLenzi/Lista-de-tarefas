const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'Public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'), (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, 'public', 'index.html'), (err2) => {
                if (err2) {
                    res.sendFile(path.join(__dirname, 'index.html'));
                }
            });
        }
    });
});

const db = new sqlite3.Database('tarefas.db');

db.run(`
CREATE TABLE IF NOT EXISTS tarefas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL,
    custo REAL NOT NULL,
    data_limite TEXT NOT NULL,
    ordem INTEGER NOT NULL
)`);

app.get('/tarefas', (req, res) => {
    db.all("SELECT * FROM tarefas ORDER BY ordem", [], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

app.post('/tarefas', (req, res) => {
    const { nome, custo, data_limite } = req.body;
    db.get("SELECT MAX(ordem) as max FROM tarefas", [], (err, row) => {
        const ordem = (row ? row.max : 0) + 1;
        db.run(
            "INSERT INTO tarefas (nome, custo, data_limite, ordem) VALUES (?, ?, ?, ?)",
            [nome, custo, data_limite, ordem],
            (err) => {
                if (err) return res.status(400).json(err);
                res.json({ ok: true });
            }
        );
    });
});

app.delete('/tarefas/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM tarefas WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json(err);
        res.json({ changes: this.changes });
    });
});

app.put('/tarefas/reordenar', (req, res) => {
    const novasOrdens = req.body;
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Rodando na porta ${port}`);
});