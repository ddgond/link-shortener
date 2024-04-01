import express from 'express';
import fs from 'fs';
import { nanoid } from 'nanoid';
import 'dotenv/config';

const app = express();
app.use(express.json());

const DB_FILE = './db.json';

const getDb = () => {
	if (fs.existsSync(DB_FILE)) {
		return JSON.parse(fs.readFileSync(DB_FILE));
	}
	return {};
};

const LIST_PASSWORD = process.env.LIST_PWD;
const SUBMIT_PASSWORD = process.env.SUBMIT_PWD;
const DELETE_PASSWORD = process.env.DELETE_PWD;

const processId = id => {
	if (typeof id !== 'string' || id.length === 0) {
		return null;
	}
	while (id[0] === '/') {
		id = id.slice(1);
	}
	while (id[id.length-1] === '/') {
		id = id.slice(0, id.length-1);
	}
	if (id.length === 0) {
		return null;
	}
	return id.toLowerCase();
};

const style = `<style>code {color: white; background-color: black; border-radius: 4px; padding: 8px 16px;} .key {color: #00AAFF} a:hover .key {color: #00DDFF} .value {color: #00FFAA} a:hover .value {color: #99FFCC} .list {display: grid; grid-template-columns: auto auto auto; justify-content: start; gap: 0 0.5em;} code a {text-decoration: none}</style>`;

app.get('/', (req, res) => {
	res.send(`${style}<h1>Link Shortener</h1>\n<code>/weblist?password=</code>`);
});

app.get('/weblist', (req, res) => {
  const db = getDb();
  const password = req.query.password;
  if (password !== LIST_PASSWORD) {
    return res.sendStatus(401);
  }
  let result = style + '<code class="list">';
  result += Object.entries(db).sort((a,b) => a[0].toUpperCase().localeCompare(b[0].toUpperCase())).map(entry => {
    const key = entry[0];
    const value = entry[1];
    return `<a href="${key}"><span class="key">${key}</span></a>: <a href="${value}"><span class="value">${value}</span></a>`;
  }).join('\n');
  result += '</code>'
  res.send(result);
});

app.get('/list', (req, res) => {
	const db = getDb();
	const password = req.query.password;
	if (password !== LIST_PASSWORD) {
		return res.sendStatus(401);
	}
	res.send(db);
});

app.get('/*', (req, res) => {
	const db = getDb();
	const url = db[processId(req.params[0])];
	if (url) {
		res.redirect(url);
	} else {
		res.sendStatus(404);
	}
});

app.post('/move', (req, res) => {
	const db = getDb();
	let url = req.body.url;
	const password = req.body.password;
	const id = processId(req.body.id);
	if (!url || password !== SUBMIT_PASSWORD) {
		return res.sendStatus(400);
	}
	if (!url.includes('://')) {
		url = `https://${url}`;
	}
	if (!db[id]) {
		return res.status(400).send({error: 'ID does not exist'});
	}
	db[id] = url;
	fs.writeFileSync(DB_FILE, JSON.stringify(db));
	res.send({ id, url });
});

app.post('/shorten', (req, res) => {
	const db = getDb();
	let url = req.body.url;
	const password = req.body.password;
	const customId = processId(req.body.id);
	if (!url || password !== SUBMIT_PASSWORD) {
		return res.sendStatus(400);
	}
	if (!url.includes('://')) {
		url = `https://${url}`;
	}
	let id;
	if (customId) {
		if (db[customId]) {
			return res.status(400).send({error: 'ID in use'});
		} else {
			id = customId;
		}
	} else {
		id = processId(nanoid(2));
	}
	
	db[id] = url;
	fs.writeFileSync(DB_FILE, JSON.stringify(db));
	res.send({ id, url });
});

app.delete('/*', (req, res) => {
	const db = getDb();
	const password = req.query.password;
	if (password !== DELETE_PASSWORD) {
		return res.sendStatus(401);
	}
	const id = processId(req.params[0]);
	if (!id || !db[id]) {
		return res.sendStatus(404);
	}
	delete db[id];
	fs.writeFileSync(DB_FILE, JSON.stringify(db));
	res.sendStatus(200);
});

app.listen(8123, () => {
	console.log('Server listening on port 8123');
});
