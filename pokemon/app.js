const API = 'https://pokeapi.co/api/v2';
const statusEl = document.getElementById('status');
const cardsView = document.getElementById('cardsView');
const kanbanView = document.getElementById('kanbanView');
const tableView = document.getElementById('tableView');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const generationFilter = document.getElementById('generationFilter');
const dialog = document.getElementById('pokemonDialog');
const detail = document.getElementById('pokemonDetail');
const closeDialog = document.getElementById('closeDialog');

let allPokemon = [];
let filteredPokemon = [];
let currentView = 'cards';
let sortAZ = true;

async function fetchPokemon(limit = 151) {
  statusEl.textContent = 'Cargando Pokémon...';
  const listRes = await fetch(`${API}/pokemon?limit=${limit}`);
  const listData = await listRes.json();
  const data = await Promise.all(
    listData.results.map(async (p) => {
      const res = await fetch(p.url);
      const poke = await res.json();
      return {
        id: poke.id,
        name: poke.name,
        image: poke.sprites.other['official-artwork'].front_default || poke.sprites.front_default,
        types: poke.types.map((t) => t.type.name),
        height: poke.height / 10,
        weight: poke.weight / 10,
        stats: poke.stats.map((s) => ({ name: s.stat.name, value: s.base_stat }))
      };
    })
  );

  allPokemon = data.sort((a, b) => a.id - b.id);
  buildTypeFilter();
  applyFilters();
  statusEl.textContent = `${allPokemon.length} Pokémon cargados.`;
}

function buildTypeFilter() {
  const types = [...new Set(allPokemon.flatMap((p) => p.types))].sort();
  typeFilter.innerHTML = '<option value="">Todos los tipos</option>';
  types.forEach((t) => {
    const option = document.createElement('option');
    option.value = t;
    option.textContent = t;
    typeFilter.appendChild(option);
  });
}

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;

  filteredPokemon = allPokemon.filter((p) => {
    const matchName = p.name.includes(q);
    const matchType = !selectedType || p.types.includes(selectedType);
    return matchName && matchType;
  });

  renderCards(filteredPokemon);
  renderKanban(filteredPokemon);
  renderTable(filteredPokemon);
  statusEl.textContent = `${filteredPokemon.length} resultados.`;
}

function renderCards(list) {
  cardsView.innerHTML = list.map((p) => `
    <article class="poke-card">
      <img src="${p.image}" alt="${p.name}">
      <h3>#${p.id} ${p.name}</h3>
      <div class="types">${p.types.map((t) => `<span class="type-badge">${t}</span>`).join('')}</div>
      <div class="poke-meta">
        <span>Altura: ${p.height} m</span>
        <span>Peso: ${p.weight} kg</span>
      </div>
      <button class="more-btn" onclick="openPokemon(${p.id})">Ver ficha</button>
    </article>
  `).join('');
}

function renderKanban(list) {
  const byType = {};
  list.forEach((p) => {
    p.types.forEach((t) => {
      byType[t] ??= [];
      byType[t].push(p);
    });
  });

  const sortedTypes = Object.keys(byType).sort();
  kanbanView.innerHTML = sortedTypes.map((type) => `
    <section class="kanban-col">
      <h4>${type} (${byType[type].length})</h4>
      ${byType[type]
        .slice(0, 12)
        .map((p) => `<div class="kanban-item" onclick="openPokemon(${p.id})">#${p.id} ${p.name}</div>`)
        .join('')}
    </section>
  `).join('');
}

function renderTable(list) {
  const sorted = [...list].sort((a, b) => {
    const res = a.name.localeCompare(b.name, 'es');
    return sortAZ ? res : -res;
  });

  tableView.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th><button id="sortName">Nombre ${sortAZ ? '▲' : '▼'}</button></th>
            <th>Tipos</th>
            <th>Altura (m)</th>
            <th>Peso (kg)</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((p) => `
            <tr>
              <td>${p.id}</td>
              <td><button onclick="openPokemon(${p.id})">${p.name}</button></td>
              <td>${p.types.join(', ')}</td>
              <td>${p.height}</td>
              <td>${p.weight}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('sortName').addEventListener('click', () => {
    sortAZ = !sortAZ;
    renderTable(filteredPokemon);
  });
}

async function openPokemon(id) {
  const pokemon = allPokemon.find((p) => p.id === id);
  const speciesRes = await fetch(`${API}/pokemon-species/${id}`);
  const species = await speciesRes.json();
  const entry = species.flavor_text_entries.find((e) => e.language.name === 'es')
    || species.flavor_text_entries.find((e) => e.language.name === 'en');

  detail.innerHTML = `
    <h2>#${pokemon.id} ${pokemon.name}</h2>
    <img src="${pokemon.image}" alt="${pokemon.name}" width="180">
    <p><strong>Tipos:</strong> ${pokemon.types.join(', ')}</p>
    <p><strong>Altura:</strong> ${pokemon.height} m | <strong>Peso:</strong> ${pokemon.weight} kg</p>
    <p><strong>Descripción:</strong> ${(entry?.flavor_text || 'Sin descripción.').replace(/\f|\n/g, ' ')}</p>
    <h3>Estadísticas base</h3>
    <ul>
      ${pokemon.stats.map((s) => `<li>${s.name}: ${s.value}</li>`).join('')}
    </ul>
  `;

  dialog.showModal();
}

function setView(view) {
  currentView = view;
  cardsView.classList.toggle('hidden', view !== 'cards');
  kanbanView.classList.toggle('hidden', view !== 'kanban');
  tableView.classList.toggle('hidden', view !== 'table');
  document.querySelectorAll('.view-switch button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

searchInput.addEventListener('input', applyFilters);
typeFilter.addEventListener('change', applyFilters);
generationFilter.addEventListener('change', () => fetchPokemon(Number(generationFilter.value)));
closeDialog.addEventListener('click', () => dialog.close());
document.querySelectorAll('.view-switch button').forEach((btn) => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

window.openPokemon = openPokemon;
fetchPokemon();