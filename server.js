const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());


app.use(express.static('public'));
app.use(express.static('.')); 


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


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Rodando na porta ${port}`);
});