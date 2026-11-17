require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORTA = process.env.PORTA || 3000;
const DB_PATH = process.env.DB_FILE || path.join(__dirname, 'tarefas.db');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conecta ao arquivo SQLite (cria o arquivo automaticamente se não existir)
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco SQLite:', err.message);
        return;
    }
    console.log('Conectado ao banco SQLite com sucesso!');
});

// Cria a tabela automaticamente ao iniciar
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS listas_tarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('descricao', 'sequencia')),
            conteudo TEXT NOT NULL,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Erro ao criar tabela:', err.message);
        } else {
            console.log('Tabela "listas_tarefas" pronta para uso.');
        }
    });
});

// ==========================================
// ROTAS DO CRUD
// ==========================================

// [READ] Listar todas as listas de tarefas
app.get('/api/listas', (req, res) => {
    const sql = 'SELECT * FROM listas_tarefas ORDER BY id DESC';

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ erro: 'Erro ao buscar listas.', detalhes: err.message });
        }
        res.json(rows);
    });
});

// [CREATE] Criar uma nova lista de tarefas
app.post('/api/listas', (req, res) => {
    const { titulo, tipo, conteudo } = req.body;

    if (!titulo || !tipo || !conteudo) {
        return res.status(400).json({ erro: 'Título, tipo e conteúdo são obrigatórios.' });
    }
    if (tipo !== 'descricao' && tipo !== 'sequencia') {
        return res.status(400).json({ erro: 'Tipo inválido. Use "descricao" ou "sequencia".' });
    }

    const sql = 'INSERT INTO listas_tarefas (titulo, tipo, conteudo) VALUES (?, ?, ?)';

    // Nota: Usa "function" tradicional para acessar o "this.lastID" do sqlite3
    db.run(sql, [titulo, tipo, conteudo], function (err) {
        if (err) {
            return res.status(500).json({ erro: 'Erro ao criar lista.', detalhes: err.message });
        }
        res.status(201).json({
            id: this.lastID,
            titulo,
            tipo,
            conteudo
        });
    });
});

// [UPDATE] Atualizar uma lista existente
app.put('/api/listas/:id', (req, res) => {
    const { id } = req.params;
    const { titulo, tipo, conteudo } = req.body;

    if (!titulo || !tipo || !conteudo) {
        return res.status(400).json({ erro: 'Título, tipo e conteúdo são obrigatórios.' });
    }
    if (tipo !== 'descricao' && tipo !== 'sequencia') {
        return res.status(400).json({ erro: 'Tipo inválido. Use "descricao" ou "sequencia".' });
    }

    const sql = 'UPDATE listas_tarefas SET titulo = ?, tipo = ?, conteudo = ? WHERE id = ?';

    db.run(sql, [titulo, tipo, conteudo, id], function (err) {
        if (err) {
            return res.status(500).json({ erro: 'Erro ao atualizar lista.', detalhes: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ erro: 'Lista não encontrada.' });
        }
        res.json({ mensagem: 'Lista atualizada com sucesso!' });
    });
});

// [DELETE] Excluir uma lista
app.delete('/api/listas/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM listas_tarefas WHERE id = ?';

    db.run(sql, [id], function (err) {
        if (err) {
            return res.status(500).json({ erro: 'Erro ao excluir lista.', detalhes: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ erro: 'Lista não encontrada.' });
        }
        res.json({ mensagem: 'Lista excluída com sucesso!' });
    });
});

// Inicia o servidor
app.listen(PORTA, () => {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
});