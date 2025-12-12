/* script.js — controla login e todas as páginas com dados mockados
   Comportamento:
   - Carrega dados de dados.json na primeira visita e salva em localStorage como "db"
   - Cada página detecta seu papel (usando location.pathname) e renderiza UI
   - CRUD simulado altera o objeto "db" em memória e persiste em localStorage
*/

const DB_KEY = 'db_prototipo_escola_v1';
let DB = null;
let currentUser = null;

/* UTILIDADES */
const uid = (prefix='id') => prefix + Math.random().toString(36).slice(2,9);

/* Inicializa DB: se não existe no localStorage, carrega dados.json */
async function initDB(){
  const raw = localStorage.getItem(DB_KEY);
  if(raw){
    DB = JSON.parse(raw);
    return;
  }
  // carregar dados.json
  const r = await fetch('dados.json');
  DB = await r.json();
  // ensure ids for some items
  DB.alunos = DB.alunos || [];
  DB.professores = DB.professores || [];
  DB.disciplinas = DB.disciplinas || [];
  DB.turmas = DB.turmas || [];
  DB.notas = DB.notas || [];
  DB.frequencia = DB.frequencia || [];
  DB.tarefas = DB.tarefas || [];
  DB.avisos = DB.avisos || [];
  DB.aulas = DB.aulas || [];
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
}

/* Salva DB */
function saveDB(){
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
}

/* Login (index.html) */
async function tryLogin(){
  const l = document.getElementById('login').value.trim();
  const s = document.getElementById('senha').value.trim();
  const msg = document.getElementById('msg');

  if(!l || !s){ msg.innerText = 'Preencha usuário e senha'; return; }

  await initDB();
  const user = DB.usuarios.find(u => u.login === l && u.senha === s);
  if(!user){ msg.innerText = 'Usuário ou senha incorretos'; return; }

  // grava sessão temporária
  sessionStorage.setItem('sess_user', JSON.stringify(user));
  // redirect de acordo com tipo
  if(user.tipo === 'professor') location.href = 'professor.html';
  else if(user.tipo === 'aluno') location.href = 'aluno.html';
  else if(user.tipo === 'secretaria') location.href = 'secretaria.html';
  else if(user.tipo === 'diretor') location.href = 'diretor.html';
}

/* Recupera usuário da sessão */
function loadSession(){
  const raw = sessionStorage.getItem('sess_user');
  if(!raw) return null;
  return JSON.parse(raw);
}

/* Common: colocar nome do usuário no header (se existir) */
function initHeader(){
  const user = loadSession();
  const el = document.getElementById('usuarioLabel');
  if(el && user) el.innerText = `${user.nome || user.login} — ${user.tipo}`;
  // logout links
  document.querySelectorAll('#logout').forEach(a => {
    a && a.addEventListener('click', () => {
      sessionStorage.removeItem('sess_user');
    });
  });
}

/* --- PÁGINAS --- */

/* Professor page */
function renderProfessor(){
  initHeader();
  const content = document.getElementById('content');
  content.innerHTML = '';

  // cards: notas recentes, registrar aula, frequencia, avisos/tarefas
  const notasCard = document.createElement('div'); notasCard.className='card-panel';
  notasCard.innerHTML = `<h3>Últimas Notas</h3>
    <table class="table" id="tableNotas">
      <thead><tr><th>Aluno</th><th>Disciplina</th><th>Nota</th></tr></thead>
      <tbody></tbody>
    </table>`;
  content.appendChild(notasCard);

  const aulaCard = document.createElement('div'); aulaCard.className='card-panel';
  aulaCard.innerHTML = `<h3>Registrar Aula</h3>
    <div class="form-row">
      <div class="col"><input class="input" id="aula-turma" placeholder="Turma (ex: 1A)"></div>
      <div class="col"><input class="input" id="aula-data" type="date"></div>
    </div>
    <div style="margin-top:8px">
      <textarea id="aula-desc" class="input" placeholder="Descrição da aula"></textarea>
    </div>
    <div style="margin-top:8px"><button class="btn-sm btn-success" id="btnSalvarAula">Salvar Aula</button></div>`;
  content.appendChild(aulaCard);

  const freqCard = document.createElement('div'); freqCard.className='card-panel';
  freqCard.innerHTML = `<h3>Registrar Frequência</h3>
    <div class="form-row">
      <div class="col"><select id="freq-aluno" class="input"></select></div>
      <div class="col"><input id="freq-data" class="input" type="date"></div>
    </div>
    <div style="margin-top:8px">
      <label><input id="freq-presente" type="checkbox"> Presente</label>
      <button class="btn-sm btn-muted" id="btnSalvarFreq" style="margin-left:8px">Salvar</button>
    </div>`;
  content.appendChild(freqCard);

  const avisosCard = document.createElement('div'); avisosCard.className='card-panel';
  avisosCard.innerHTML = `<h3>Avisos e Tarefas</h3>
    <div class="form-row">
      <div class="col"><input id="av-titulo" class="input" placeholder="Título do aviso/tarefa"></div>
    </div>
    <div style="margin-top:8px"><textarea id="av-texto" class="input" placeholder="Descrição"></textarea></div>
    <div style="margin-top:8px"><button id="btnSalvarAviso" class="btn-sm btn-success">Salvar Aviso/Tarefa</button></div>

    <hr>
    <h4>Avisos existentes</h4>
    <div id="listaAvisos"></div>`;
  content.appendChild(avisosCard);

  // preencher dados
  const tbody = document.querySelector('#tableNotas tbody');
  tbody.innerHTML = '';
  DB.notas.forEach(n => {
    const aluno = DB.alunos.find(a => a.id === n.alunoId);
    const disc = DB.disciplinas.find(d => d.id === n.disciplinaId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${aluno ? aluno.nome : n.alunoId}</td><td>${disc ? disc.nome : n.disciplinaId}</td><td>${n.nota}</td>`;
    tbody.appendChild(tr);
  });

  // preencher select alunos
  const selAl = document.getElementById('freq-aluno');
  selAl.innerHTML = '';
  DB.alunos.forEach(a => {
    const o = document.createElement('option'); o.value = a.id; o.innerText = `${a.nome} (${a.matricula})`; selAl.appendChild(o);
  });

  // lista avisos
  function refreshAvisos(){
    const container = document.getElementById('listaAvisos');
    container.innerHTML = '';
    DB.avisos.forEach(av => {
      const div = document.createElement('div'); div.className='card-panel';
      div.innerHTML = `<strong>${av.titulo}</strong><p class="small">${av.texto}</p>`;
      container.appendChild(div);
    });
  }
  refreshAvisos();

  // eventos
  document.getElementById('btnSalvarAula').onclick = () => {
    const turmaNome = document.getElementById('aula-turma').value || 'não informada';
    const data = document.getElementById('aula-data').value || new Date().toISOString().slice(0,10);
    const desc = document.getElementById('aula-desc').value || '';
    DB.aulas.push({ id: uid('au'), turmaNome, data, descricao: desc });
    saveDB();
    alert('Aula registrada (simulado).');
    document.getElementById('aula-desc').value = '';
  };

  document.getElementById('btnSalvarFreq').onclick = () => {
    const alunoId = document.getElementById('freq-aluno').value;
    const data = document.getElementById('freq-data').value || new Date().toISOString().slice(0,10);
    const presente = document.getElementById('freq-presente').checked;
    DB.frequencia.push({ id: uid('f'), alunoId, data, presente });
    saveDB();
    alert('Frequência registrada (simulado).');
  };

  document.getElementById('btnSalvarAviso').onclick = () => {
    const t = document.getElementById('av-titulo').value.trim();
    const txt = document.getElementById('av-texto').value.trim();
    if(!t) return alert('Coloque um título');
    DB.avisos.push({ id: uid('av'), titulo: t, texto: txt });
    saveDB();
    refreshAvisos();
    document.getElementById('av-titulo').value = '';
    document.getElementById('av-texto').value = '';
  };
}

/* Aluno page */
function renderAluno(){
  initHeader();
  const content = document.getElementById('content');
  content.innerHTML = '';

  const user = loadSession();
  // Boletim
  const boletim = document.createElement('div'); boletim.className='card-panel';
  boletim.innerHTML = `<h3>Boletim</h3><table class="table"><thead><tr><th>Disciplina</th><th>Nota</th></tr></thead><tbody id="boletim-body"></tbody></table>`;
  content.appendChild(boletim);

  // Frequencia
  const freqCard = document.createElement('div'); freqCard.className='card-panel';
  freqCard.innerHTML = `<h3>Frequência</h3><table class="table"><thead><tr><th>Data</th><th>Presente</th></tr></thead><tbody id="freq-body"></tbody></table>`;
  content.appendChild(freqCard);

  // tarefas
  const tarefaCard = document.createElement('div'); tarefaCard.className='card-panel';
  tarefaCard.innerHTML = `<h3>Tarefas</h3><div id="tarefas-list"></div>`;
  content.appendChild(tarefaCard);

  // preencher boletim
  const aluno = DB.alunos.find(a => a.nome === user.nome) || DB.alunos[0];
  const boletimBody = document.getElementById('boletim-body');
  boletimBody.innerHTML = '';
  DB.notas.filter(n => n.alunoId === aluno.id).forEach(n => {
    const disc = DB.disciplinas.find(d => d.id === n.disciplinaId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${disc ? disc.nome : n.disciplinaId}</td><td>${n.nota}</td>`;
    boletimBody.appendChild(tr);
  });

  // preencher frequencia
  const freqBody = document.getElementById('freq-body');
  freqBody.innerHTML = '';
  DB.frequencia.filter(f => f.alunoId === aluno.id).forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${f.data}</td><td>${f.presente ? 'Sim' : 'Não'}</td>`;
    freqBody.appendChild(tr);
  });

  // tarefas
  const tarefasList = document.getElementById('tarefas-list');
  tarefasList.innerHTML = '';
  DB.tarefas.forEach(t => {
    const ent = t.entreguePor && t.entreguePor.includes(aluno.id);
    const div = document.createElement('div'); div.className='card-panel';
    div.innerHTML = `<strong>${t.titulo}</strong><p class="small">${t.descricao}</p>
      <div style="margin-top:8px"><button class="btn-sm ${ent ? 'btn-muted' : 'btn-success'}" data-id="${t.id}">${ent ? 'Entregue' : 'Marcar como entregue'}</button></div>`;
    tarefasList.appendChild(div);
  });

  // eventos: marcar tarefa entregue
  tarefasList.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      const t = DB.tarefas.find(tt => tt.id === id);
      if(!t) return;
      if(!t.entreguePor) t.entreguePor = [];
      if(!t.entreguePor.includes(aluno.id)) t.entreguePor.push(aluno.id);
      saveDB();
      renderAluno(); // rerender
    });
  });
}

/* Secretaria page */
function renderSecretaria(){
  initHeader();
  const content = document.getElementById('content');
  content.innerHTML = '';

  // Cards: cadastrar aluno, professor, disciplina, turma, alocar
  const cadAluno = document.createElement('div'); cadAluno.className='card-panel';
  cadAluno.innerHTML = `<h3>Cadastrar Aluno</h3>
    <div class="form-row">
      <div class="col"><input id="in-aluno-nome" class="input" placeholder="Nome do aluno"></div>
      <div class="col"><input id="in-aluno-mat" class="input" placeholder="Matrícula"></div>
    </div>
    <div style="margin-top:8px"><button id="btnCadAluno" class="btn-sm btn-success">Cadastrar Aluno</button></div>`;
  content.appendChild(cadAluno);

  const cadProf = document.createElement('div'); cadProf.className='card-panel';
  cadProf.innerHTML = `<h3>Cadastrar Professor</h3>
    <div class="form-row"><div class="col"><input id="in-prof-nome" class="input" placeholder="Nome do professor"></div></div>
    <div style="margin-top:8px"><button id="btnCadProf" class="btn-sm btn-success">Cadastrar Professor</button></div>`;
  content.appendChild(cadProf);

  const cadDisc = document.createElement('div'); cadDisc.className='card-panel';
  cadDisc.innerHTML = `<h3>Cadastrar Disciplina</h3>
    <div class="form-row"><div class="col"><input id="in-disc-nome" class="input" placeholder="Nome da disciplina"></div></div>
    <div style="margin-top:8px"><button id="btnCadDisc" class="btn-sm btn-success">Cadastrar Disciplina</button></div>`;
  content.appendChild(cadDisc);

  const cadTurma = document.createElement('div'); cadTurma.className='card-panel';
  cadTurma.innerHTML = `<h3>Cadastrar Turma</h3>
    <div class="form-row">
      <div class="col"><input id="in-turma-nome" class="input" placeholder="Nome da turma (ex: 1A)"></div>
      <div class="col"><select id="in-turma-disc" class="input"></select></div>
    </div>
    <div style="margin-top:8px"><button id="btnCadTurma" class="btn-sm btn-success">Cadastrar Turma</button></div>`;
  content.appendChild(cadTurma);

  const alocar = document.createElement('div'); alocar.className='card-panel';
  alocar.innerHTML = `<h3>Alocar Professor em Turma</h3>
    <div class="form-row">
      <div class="col"><select id="sel-prof" class="input"></select></div>
      <div class="col"><select id="sel-turma" class="input"></select></div>
    </div>
    <div style="margin-top:8px"><button id="btnAlocar" class="btn-sm btn-success">Alocar</button></div>`;
  content.appendChild(alocar);

  // Lista de alunos cadastrados
  const lista = document.createElement('div'); lista.className='card-panel';
  lista.innerHTML = `<h3>Alunos Cadastrados</h3><div id="listaAlunos"></div>`;
  content.appendChild(lista);

  // preencher selects e listas
  const selDisc = document.getElementById('in-turma-disc');
  selDisc.innerHTML = '';
  DB.disciplinas.forEach(d => {
    const o = document.createElement('option'); o.value = d.id; o.innerText = d.nome; selDisc.appendChild(o);
  });

  const selProf = document.getElementById('sel-prof');
  selProf.innerHTML = '';
  DB.professores.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.innerText = p.nome; selProf.appendChild(o); });

  const selTurma = document.getElementById('sel-turma');
  selTurma.innerHTML = '';
  DB.turmas.forEach(t => { const o = document.createElement('option'); o.value = t.id; o.innerText = t.nome; selTurma.appendChild(o); });

  function renderAlunos(){
    const container = document.getElementById('listaAlunos');
    container.innerHTML = '';
    DB.alunos.forEach(a => {
      const d = document.createElement('div'); d.className='card-panel';
      d.innerHTML = `<strong>${a.nome}</strong><div class="small">Matricula: ${a.matricula}</div>`;
      container.appendChild(d);
    });
  }
  renderAlunos();

  // eventos
  document.getElementById('btnCadAluno').onclick = () => {
    const nome = document.getElementById('in-aluno-nome').value.trim();
    const mat = document.getElementById('in-aluno-mat').value.trim() || `M-${Date.now()}`;
    if(!nome){ alert('Informe o nome'); return; }
    DB.alunos.push({ id: uid('a'), nome, matricula: mat });
    saveDB();
    document.getElementById('in-aluno-nome').value = '';
    document.getElementById('in-aluno-mat').value = '';
    renderAlunos();
    alert('Aluno cadastrado (simulado).');
  };

  document.getElementById('btnCadProf').onclick = () => {
    const nome = document.getElementById('in-prof-nome').value.trim();
    if(!nome) return alert('Informe o nome');
    const id = uid('p');
    DB.professores.push({ id, nome });
    // criar também usuário de login para professor (simulado)
    DB.usuarios.push({ login: nome.split(' ')[0].toLowerCase(), senha: '123', tipo: 'professor', nome });
    saveDB();
    document.getElementById('in-prof-nome').value = '';
    alert('Professor cadastrado (simulado).');
    renderSecretaria(); // rerender para atualizar selects
  };

  document.getElementById('btnCadDisc').onclick = () => {
    const nome = document.getElementById('in-disc-nome').value.trim();
    if(!nome) return alert('Informe o nome');
    DB.disciplinas.push({ id: uid('d'), nome });
    saveDB();
    document.getElementById('in-disc-nome').value = '';
    alert('Disciplina cadastrada (simulado).');
    renderSecretaria();
  };

  document.getElementById('btnCadTurma').onclick = () => {
    const nome = document.getElementById('in-turma-nome').value.trim();
    const discId = document.getElementById('in-turma-disc').value;
    if(!nome) return alert('Informe o nome da turma');
    DB.turmas.push({ id: uid('t'), nome, disciplinaId: discId, professorId: null });
    saveDB();
    document.getElementById('in-turma-nome').value = '';
    alert('Turma cadastrada (simulado).');
    renderSecretaria();
  };

  document.getElementById('btnAlocar').onclick = () => {
    const profId = document.getElementById('sel-prof').value;
    const turmaId = document.getElementById('sel-turma').value;
    const turma = DB.turmas.find(t => t.id === turmaId);
    if(turma) turma.professorId = profId;
    saveDB();
    alert('Professor alocado (simulado).');
    renderSecretaria();
  };
}

/* Diretor page */
function renderDiretor(){
  initHeader();
  const content = document.getElementById('content');
  content.innerHTML = '';

  const relNotas = document.createElement('div'); relNotas.className='card-panel';
  relNotas.innerHTML = `<h3>Relatório de Notas</h3>
    <table class="table"><thead><tr><th>Aluno</th><th>Disciplina</th><th>Nota</th></tr></thead><tbody id="rel-notas-body"></tbody></table>`;
  content.appendChild(relNotas);

  const relFreq = document.createElement('div'); relFreq.className='card-panel';
  relFreq.innerHTML = `<h3>Relatório de Frequência</h3>
    <table class="table"><thead><tr><th>Aluno</th><th>Data</th><th>Presente</th></tr></thead><tbody id="rel-freq-body"></tbody></table>`;
  content.appendChild(relFreq);

  const relMat = document.createElement('div'); relMat.className='card-panel';
  relMat.innerHTML = `<h3>Alunos Matriculados</h3><div id="rel-mat-list"></div>`;
  content.appendChild(relMat);

  // preencher
  const rn = document.getElementById('rel-notas-body');
  rn.innerHTML = '';
  DB.notas.forEach(n => {
    const a = DB.alunos.find(x => x.id === n.alunoId);
    const d = DB.disciplinas.find(x => x.id === n.disciplinaId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a ? a.nome : n.alunoId}</td><td>${d ? d.nome : n.disciplinaId}</td><td>${n.nota}</td>`;
    rn.appendChild(tr);
  });

  const rf = document.getElementById('rel-freq-body'); rf.innerHTML = '';
  DB.frequencia.forEach(f => {
    const a = DB.alunos.find(x => x.id === f.alunoId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a ? a.nome : f.alunoId}</td><td>${f.data}</td><td>${f.presente ? 'Sim' : 'Não'}</td>`;
    rf.appendChild(tr);
  });

  const rm = document.getElementById('rel-mat-list'); rm.innerHTML = '';
  DB.alunos.forEach(a => {
    const d = document.createElement('div'); d.className='card-panel';
    d.innerHTML = `<strong>${a.nome}</strong><div class="small">Matrícula: ${a.matricula}</div>`;
    rm.appendChild(d);
  });
}

/* Router: executar a função adequada conforme o page */
async function boot(){
  await initDB();
  const path = location.pathname.split('/').pop();
  currentUser = loadSession();

  // pagina index.html
  if(path === '' || path === 'index.html' || path === undefined){
    // if already logged, redirect
    if(currentUser){
      if(currentUser.tipo === 'professor') location.href = 'professor.html';
      else if(currentUser.tipo === 'aluno') location.href = 'aluno.html';
      else if(currentUser.tipo === 'secretaria') location.href = 'secretaria.html';
      else if(currentUser.tipo === 'diretor') location.href = 'diretor.html';
      return;
    }
    document.getElementById('btnLogin').addEventListener('click', tryLogin);
    return;
  }

  // todas páginas internas exigem sessão; se não, volta pro login
  if(!currentUser){ alert('Faça login primeiro'); location.href = 'index.html'; return; }

  // inicializa header e conteúdo conforme página
  if(path === 'professor.html'){ renderProfessor(); }
  else if(path === 'aluno.html'){ renderAluno(); }
  else if(path === 'secretaria.html'){ renderSecretaria(); }
  else if(path === 'diretor.html'){ renderDiretor(); }

  // init header elements (logout)
  initHeader();
}

// run boot on load
boot();
