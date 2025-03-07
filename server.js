const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// Configuração do banco de dados MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rifaonline',
    port: 3306
});

db.connect((err) => {
    if (err) throw err;
    console.log('Conectado ao banco de dados MySQL');
});

app.post('/cadastrar', (req, res) => {
    const { nome, cpf, telefone } = req.body;

    // Primeiro, verifique se o CPF ou o telefone já estão cadastrados
    const checkQuery = `SELECT * FROM participante WHERE cpf = ? OR tel = ?`;
    db.query(checkQuery, [cpf, telefone], (err, results) => {
        if (err) {
            console.error("Erro ao verificar Chave Pix e telefone:", err);
            return res.status(500).send({ error: 'Erro ao verificar cadastro.' });
        }
        
        if (results.length > 0) {
            // Se houver resultados, significa que o CPF ou o telefone já estão cadastrados
            return res.status(400).send({ error: 'Chave Pix ou telefone já cadastrados.' });
        }

        // Se não houver resultados, continue com o cadastro
        const insertQuery = `INSERT INTO participante (nome, cpf, tel) VALUES (?, ?, ?)`;
        db.query(insertQuery, [nome, cpf, telefone], (err, result) => {
            if (err) {
                console.error("Erro ao inserir participante:", err);
                return res.status(500).send({ error: 'Erro ao cadastrar' });
            }
            const idParticipante = result.insertId;
            res.status(200).send({ message: 'Participante cadastrado com sucesso', idParticipante });
        });
    });
});

// Rota para login de participante
app.post('/login', (req, res) => {
    const { nome, cpf, telefone } = req.body;
    const query = `SELECT idParticipante FROM participante WHERE nome = ? AND cpf = ? AND tel = ?`;

    db.query(query, [nome, cpf, telefone], (err, results) => {
        if (err) {
            console.error("Erro ao realizar login:", err);
            return res.status(500).send({ error: 'Erro ao realizar login' });
        }
        if (results.length > 0) {
            const idParticipante = results[0].idParticipante;
            res.status(200).send({ message: 'Login bem-sucedido', idParticipante });
        } else {
            res.status(404).send({ error: 'Dados incorretos. Verifique suas informações e tente novamente.' });
        }
    });
});

// Rota para login de Admin
app.post('/admin-login', (req, res) => {
    const { nome, senha} = req.body;
    const query = `SELECT idParticipante FROM participante WHERE nome = ? AND senha = ?`;

    db.query(query, [nome, senha], (err, results) => {
        if (err) {
            console.error("Erro ao realizar login:", err);
            return res.status(500).send({ error: 'Erro ao realizar login' });
        }
        if (results.length > 0) {
            const idParticipante = results[0].idParticipante;
            res.status(200).send({ message: 'Login bem-sucedido', idParticipante });
        } else {
            res.status(404).send({ error: 'Dados incorretos. Verifique suas informações e tente novamente.' });
        }
    });
});



// Rota para registrar compra de números da rifa
app.post('/comprar', (req, res) => {
    const { idParticipante, numeros } = req.body;

    if (!idParticipante || !numeros || !numeros.length) {
        return res.status(400).send({ error: "ID do participante e números são obrigatórios" });
    }

    const query = 'INSERT INTO rifa (numero, idParticipante) VALUES ?';
    const values = numeros.map(numero => [numero, idParticipante]);

    db.query(query, [values], (err, result) => {
        if (err) {
            console.error("Erro ao registrar compra:", err);
            return res.status(500).send({ error: 'Erro ao registrar a compra' });
        }
        res.status(200).send({ message: 'Números comprados com sucesso!' });
    });
});

// Rota para buscar números já comprados
app.get('/numeros-comprados', (req, res) => {
    const query = 'SELECT numero FROM rifa';
    db.query(query, (err, results) => {
        if (err) {
            console.error("Erro ao buscar números comprados:", err);
            return res.status(500).send({ error: 'Erro ao buscar números comprados.' });
        }
        const numerosComprados = results.map(row => row.numero); // Extrai apenas os números
        res.status(200).send(numerosComprados);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Rota para obter o total de números comprados
app.get('/total-numeros', (req, res) => {
    const query = `SELECT COUNT(*) AS totalNumeros FROM Rifa`;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Erro ao obter total de números:", err);
            return res.status(500).send({ error: 'Erro ao obter total de números.' });
        }
        const totalNumeros = results[0].totalNumeros;
        res.status(200).send({ totalNumeros });
    });
});


// Rota para buscar participante pelo número da rifa
app.get('/buscar-participante', (req, res) => {
    const { numero } = req.query;

    const query = `
        SELECT p.nome, p.cpf
        FROM participante AS p
        INNER JOIN Rifa AS r ON p.idParticipante = r.idParticipante
        WHERE r.numero = ?
    `;

    db.query(query, [numero], (err, results) => {
        if (err) {
            console.error("Erro ao buscar participante:", err);
            return res.status(500).send({ error: 'Erro ao buscar participante.' });
        }
        if (results.length > 0) {
            res.status(200).send(results[0]);
        } else {
            res.status(404).send({ error: 'Nenhum participante encontrado para este número.' });
        }
    });
});


// Rota para limpar a rifa, mantendo o admin
app.delete('/limpar-rifa', (req, res) => {
    // Query para deletar todos os registros da tabela Rifa
    const deleteRifaQuery = `DELETE FROM Rifa`;

    // Query para deletar todos os participantes, exceto o que tem a senha '123456'
    const deleteParticipantesQuery = `DELETE FROM participante WHERE idParticipante != 34`;

    db.query(deleteRifaQuery, (err) => {
        if (err) {
            console.error("Erro ao limpar a tabela Rifa:", err);
            return res.status(500).send({ error: 'Erro ao limpar rifa.' });
        }

        db.query(deleteParticipantesQuery, (err) => {
            if (err) {
                console.error("Erro ao limpar a tabela participante:", err);
                return res.status(500).send({ error: 'Erro ao limpar participantes.' });
            }
            
            res.status(200).send({ message: 'Rifa limpa com sucesso!' });
        });
    });
});
