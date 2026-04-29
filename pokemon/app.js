// ---------------------------------------------------------------------------
// Configuracion global y referencias del DOM
// ---------------------------------------------------------------------------

const API = 'https://pokeapi.co/api/v2';
const MAX_STAT_VALUE = 255;

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

// ---------------------------------------------------------------------------
// Estado de la aplicacion
// ---------------------------------------------------------------------------

let allPokemon = [];
let filteredPokemon = [];
let currentView = 'cards';
let sortAZ = true;
let currentCryAudio = null;
let currentDetailRegionalForms = [];
let currentDetailFormIndex = 0;

// ---------------------------------------------------------------------------
// Datos base de regiones y temas visuales
// ---------------------------------------------------------------------------

const regions = {
  151: { name: 'Kanto', offset: 0, limit: 151 },
  251: { name: 'Johto', offset: 151, limit: 100 },
  386: { name: 'Hoenn', offset: 251, limit: 135 },
  493: { name: 'Sinnoh', offset: 386, limit: 107 },
  649: { name: 'Teselia', offset: 493, limit: 156 },
  721: { name: 'Kalos', offset: 649, limit: 72 },
  809: { name: 'Alola', offset: 721, limit: 88 },
  898: { name: 'Galar', offset: 809, limit: 89 },
  1025: { name: 'Paldea', offset: 898, limit: 127 }
};

const allRegionsOption = {
  name: 'Todas las regiones',
  offset: 0,
  limit: 1025
};

const typeColors = {
  normal: { base: '#a8a77a', accent: '#d7d6b3', glow: 'rgba(168, 167, 122, 0.32)' },
  fire: { base: '#ee8130', accent: '#ffb067', glow: 'rgba(238, 129, 48, 0.34)' },
  water: { base: '#6390f0', accent: '#93b4ff', glow: 'rgba(99, 144, 240, 0.34)' },
  electric: { base: '#f7d02c', accent: '#ffe577', glow: 'rgba(247, 208, 44, 0.34)' },
  grass: { base: '#7ac74c', accent: '#a9e37f', glow: 'rgba(122, 199, 76, 0.34)' },
  ice: { base: '#96d9d6', accent: '#c8f3f1', glow: 'rgba(150, 217, 214, 0.34)' },
  fighting: { base: '#c22e28', accent: '#ec6a62', glow: 'rgba(194, 46, 40, 0.34)' },
  poison: { base: '#a33ea1', accent: '#d47ad0', glow: 'rgba(163, 62, 161, 0.34)' },
  ground: { base: '#e2bf65', accent: '#f0d995', glow: 'rgba(226, 191, 101, 0.34)' },
  flying: { base: '#a98ff3', accent: '#d1c0ff', glow: 'rgba(169, 143, 243, 0.34)' },
  psychic: { base: '#f95587', accent: '#ff91b2', glow: 'rgba(249, 85, 135, 0.34)' },
  bug: { base: '#a6b91a', accent: '#d5e25c', glow: 'rgba(166, 185, 26, 0.34)' },
  rock: { base: '#b6a136', accent: '#dac767', glow: 'rgba(182, 161, 54, 0.34)' },
  ghost: { base: '#735797', accent: '#a086cb', glow: 'rgba(115, 87, 151, 0.34)' },
  dragon: { base: '#6f35fc', accent: '#a27cff', glow: 'rgba(111, 53, 252, 0.34)' },
  dark: { base: '#705746', accent: '#9f8978', glow: 'rgba(112, 87, 70, 0.34)' },
  steel: { base: '#b7b7ce', accent: '#e3e3f5', glow: 'rgba(183, 183, 206, 0.34)' },
  fairy: { base: '#d685ad', accent: '#f2b7d2', glow: 'rgba(214, 133, 173, 0.34)' }
};

// ---------------------------------------------------------------------------
// Carga y normalizacion de datos
// ---------------------------------------------------------------------------

async function fetchPokemon(regionValue = '151') {
  const region = getSelectedRegion(regionValue);
  statusEl.textContent = `Cargando Pokemon de ${region.name}...`;

  const listRes = await fetch(`${API}/pokemon?offset=${region.offset}&limit=${region.limit}`);
  const listData = await listRes.json();
  const data = await Promise.all(
    listData.results.map(async (pokemonSummary) => {
      const res = await fetch(pokemonSummary.url);
      const poke = await res.json();
      const media = extractPokemonMedia(poke);

      return {
        id: poke.id,
        name: poke.name,
        image: media.image,
        shinyImage: media.shinyImage,
        sprite: media.sprite,
        cry: media.cry,
        types: poke.types.map((entry) => entry.type.name),
        height: poke.height / 10,
        weight: poke.weight / 10,
        stats: poke.stats.map((stat) => ({
          name: stat.stat.name,
          value: stat.base_stat
        }))
      };
    })
  );

  allPokemon = data.sort((a, b) => a.id - b.id);
  buildTypeFilter();
  applyFilters();
  statusEl.textContent = `${allPokemon.length} Pokemon cargados de ${region.name}.`;
}

function buildTypeFilter() {
  const types = [...new Set(allPokemon.flatMap((pokemon) => pokemon.types))].sort();
  typeFilter.innerHTML = '<option value="">Todos los tipos</option>';

  types.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = formatLabel(type);
    typeFilter.appendChild(option);
  });
}

// ---------------------------------------------------------------------------
// Filtros y vistas principales
// ---------------------------------------------------------------------------

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;
  const region = getSelectedRegion(generationFilter.value);

  filteredPokemon = allPokemon.filter((pokemon) => {
    const matchName = pokemon.name.includes(q);
    const matchType = !selectedType || pokemon.types.includes(selectedType);
    return matchName && matchType;
  });

  renderCards(filteredPokemon);
  renderKanban(filteredPokemon);
  renderTable(filteredPokemon);
  statusEl.textContent = `${filteredPokemon.length} resultados en ${region.name}.`;
}

function setView(view) {
  currentView = view;
  cardsView.classList.toggle('hidden', view !== 'cards');
  kanbanView.classList.toggle('hidden', view !== 'kanban');
  tableView.classList.toggle('hidden', view !== 'table');

  document.querySelectorAll('.view-switch button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
}

// ---------------------------------------------------------------------------
// Render de tarjetas, kanban y tabla
// ---------------------------------------------------------------------------

function renderCards(list) {
  cardsView.innerHTML = list.map((pokemon) => `
    <article class="poke-card" style="${getTypeTheme(pokemon.types)}">
      <img src="${pokemon.image}" alt="${pokemon.name}">
      <h3>#${pokemon.id} ${pokemon.name}</h3>
      <div class="types">${renderTypeBadges(pokemon.types)}</div>
      <div class="poke-meta">
        <span>Altura: ${pokemon.height} m</span>
        <span>Peso: ${pokemon.weight} kg</span>
      </div>
      <button class="more-btn" onclick="openPokemon(${pokemon.id})">Ver ficha</button>
    </article>
  `).join('');
}

function renderKanban(list) {
  const byType = {};

  list.forEach((pokemon) => {
    pokemon.types.forEach((type) => {
      byType[type] ??= [];
      byType[type].push(pokemon);
    });
  });

  const sortedTypes = Object.keys(byType).sort();
  kanbanView.innerHTML = sortedTypes.map((type) => `
    <section class="kanban-col" style="${getTypeTheme([type])}">
      <h4>${type} (${byType[type].length})</h4>
      ${byType[type].map((pokemon) => `
        <button class="kanban-item" onclick="openPokemon(${pokemon.id})" style="${getTypeTheme(pokemon.types)}">
          <img class="mini-sprite" src="${pokemon.sprite}" alt="${pokemon.name}">
          <span class="kanban-item-copy">
            <span class="kanban-item-name">#${pokemon.id} ${pokemon.name}</span>
            <span class="types kanban-types">${renderTypeBadges(pokemon.types)}</span>
          </span>
        </button>
      `).join('')}
    </section>
  `).join('');
}

function renderTable(list) {
  const sorted = [...list].sort((a, b) => {
    const result = a.name.localeCompare(b.name, 'es');
    return sortAZ ? result : -result;
  });

  tableView.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Sprite</th>
            <th><button id="sortName">Nombre ${sortAZ ? 'â–²' : 'â–¼'}</button></th>
            <th>Tipos</th>
            <th>Altura (m)</th>
            <th>Peso (kg)</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((pokemon) => `
            <tr style="${getTypeTheme(pokemon.types)}">
              <td>${pokemon.id}</td>
              <td><img class="table-sprite" src="${pokemon.sprite}" alt="${pokemon.name}"></td>
              <td><button class="table-name-btn" onclick="openPokemon(${pokemon.id})">${pokemon.name}</button></td>
              <td><div class="types table-types">${renderTypeBadges(pokemon.types)}</div></td>
              <td>${pokemon.height}</td>
              <td>${pokemon.weight}</td>
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

// ---------------------------------------------------------------------------
// Ficha detallada del Pokemon
// ---------------------------------------------------------------------------

async function openPokemon(id) {
  const pokemon = allPokemon.find((item) => item.id === id);
  if (!pokemon) {
    return;
  }

  const speciesRes = await fetch(`${API}/pokemon-species/${id}`);
  const species = await speciesRes.json();

  const typeData = await Promise.all(
    pokemon.types.map(async (type) => {
      const response = await fetch(`${API}/type/${type}`);
      return response.json();
    })
  );

  const evolutionRes = await fetch(species.evolution_chain.url);
  const evolutionChain = await evolutionRes.json();

  const entry = species.flavor_text_entries.find((item) => item.language.name === 'es')
    || species.flavor_text_entries.find((item) => item.language.name === 'en');

  const effectiveness = buildTypeEffectiveness(typeData);
  const evolutionSteps = buildEvolutionSteps(evolutionChain.chain);
  const regionalForms = await fetchRegionalForms(species, pokemon);

  currentDetailRegionalForms = regionalForms;
  currentDetailFormIndex = 0;
  const currentForm = currentDetailRegionalForms[currentDetailFormIndex];

  detail.innerHTML = `
    <section class="detail-dashboard">
      <section class="detail-hero" style="${getTypeTheme(pokemon.types)}">
        <div class="detail-title-block">
          <span class="detail-id">#${pokemon.id}</span>
          <h2>${pokemon.name}</h2>
          <div class="types">${renderTypeBadges(pokemon.types)}</div>
        </div>
        <div class="detail-hero-media">
          <div class="detail-action-stack">
            <button
              class="shiny-toggle ${pokemon.shinyImage ? '' : 'is-disabled'}"
              ${pokemon.shinyImage ? `onclick="togglePokemonShiny(${pokemon.id})"` : 'disabled'}
              aria-label="Cambiar entre version normal y shiny"
              title="Alternar shiny"
            >
              ✨
            </button>
            ${currentDetailRegionalForms.length > 1 ? `
              <button
                class="form-toggle"
                onclick="toggleRegionalForm()"
                aria-label="Cambiar forma regional"
                title="Cambiar forma regional"
              >
                🌍
              </button>
            ` : ''}
          </div>
          <button
            class="detail-hero-art ${currentForm.cry ? 'is-clickable' : 'is-silent'}"
            ${currentForm.cry ? 'onclick="playCurrentDetailCry()"' : 'disabled'}
            data-cry-src="${currentForm.cry}"
            aria-label="${currentForm.cry ? `Reproducir rugido de ${pokemon.name}` : `Sin rugido disponible para ${pokemon.name}` }"
            title="${currentForm.cry ? 'Reproducir rugido' : 'Sin rugido disponible'}"
          >
            <span
              id="detailPokemonImage"
              class="detail-card-flip"
              data-is-shiny="false"
              aria-hidden="true"
            >
              <span class="detail-card-face detail-card-front">
                <img id="detailPokemonImageNormal" src="${currentForm.image}" alt="${pokemon.name}" width="180">
              </span>
              <span class="detail-card-face detail-card-back">
                <img id="detailPokemonImageShiny" src="${currentForm.shinyImage || currentForm.image}" alt="${pokemon.name} shiny" width="180">
              </span>
            </span>
            <span class="cry-hint">${currentForm.cry ? 'Rugido' : 'Sin audio'}</span>
          </button>
          <span id="detailFormName" class="detail-form-name">${currentForm.label}</span>
        </div>
        <div class="detail-hero-side">
          <div class="detail-data-grid">
            <p><strong>Altura</strong><span>${pokemon.height} m</span></p>
            <p><strong>Peso</strong><span>${pokemon.weight} kg</span></p>
          </div>
          <p class="detail-description"><strong>Descripcion:</strong> ${(entry?.flavor_text || 'Sin descripcion.').replace(/\f|\n/g, ' ')}</p>
        </div>
      </section>
      <section class="detail-content-grid">
        <section class="detail-matchups detail-card">
          <div class="type-panel">
            <h3>Debilidades</h3>
            <div class="types detail-type-grid">${renderTypeBadges(effectiveness.weaknesses)}</div>
          </div>
          <div class="type-panel">
            <h3>Resistencias</h3>
            <div class="types detail-type-grid">${renderTypeBadges(effectiveness.resistances)}</div>
          </div>
        </section>
        <section class="detail-evolution detail-card">
          <h3>Linea evolutiva</h3>
          <div class="evolution-list evolution-list-compact">
            ${evolutionSteps.map((step, index) => `
              <div class="evolution-step ${step.id === pokemon.id ? 'current-evolution' : ''}" onclick="openPokemon(${step.id})">
                <img class="evolution-sprite" src="${step.sprite}" alt="${step.name}">
                <div class="evolution-copy">
                  <strong>#${step.id} ${step.name}</strong>
                  <span>${index === 0 ? 'Base' : step.requirement}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
        <section class="detail-stats detail-card">
          <h3>Estadisticas base</h3>
          <div class="stats-list">
            ${pokemon.stats.map((stat) => {
              const percentage = Math.min((stat.value / MAX_STAT_VALUE) * 100, 100);
              return `
                <div class="stat-row">
                  <div class="stat-label-line">
                    <span class="stat-name">${formatStatName(stat.name)}</span>
                    <span class="stat-value">${stat.value}</span>
                  </div>
                  <div class="stat-bar">
                    <span class="stat-fill" style="width: ${percentage}%"></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      </section>
    </section>
  `;

  dialog.showModal();
}
// ---------------------------------------------------------------------------
// Audio, etiquetas y temas visuales
// ---------------------------------------------------------------------------

function playPokemonCry(id) {
  const pokemon = allPokemon.find((item) => item.id === id);
  if (!pokemon?.cry) {
    return;
  }

  if (currentCryAudio) {
    currentCryAudio.pause();
    currentCryAudio.currentTime = 0;
  }

  currentCryAudio = new Audio(pokemon.cry);
  currentCryAudio.play().catch(() => {});
}

function playCurrentDetailCry() {
  const cardEl = detail.querySelector('.detail-hero-art');
  const crySrc = cardEl?.dataset.crySrc;
  if (!crySrc) {
    return;
  }

  if (currentCryAudio) {
    currentCryAudio.pause();
    currentCryAudio.currentTime = 0;
  }

  currentCryAudio = new Audio(crySrc);
  currentCryAudio.play().catch(() => {});
}

function togglePokemonShiny(id) {
  const pokemon = allPokemon.find((item) => item.id === id);
  const imageEl = document.getElementById('detailPokemonImage');
  const cardEl = detail.querySelector('.detail-hero-art');
  if (!pokemon || !imageEl || !cardEl) {
    return;
  }

  const isShiny = imageEl.dataset.isShiny === 'true';
  const nextState = isShiny ? 'false' : 'true';
  imageEl.dataset.isShiny = nextState;
  cardEl.classList.toggle('is-showing-shiny', nextState === 'true');
}

function toggleRegionalForm() {
  if (currentDetailRegionalForms.length < 2) return;

  const cardEl = detail.querySelector('.detail-hero-art');
  const flipEl = document.getElementById('detailPokemonImage');
  const normalImageEl = document.getElementById('detailPokemonImageNormal');
  const shinyImageEl = document.getElementById('detailPokemonImageShiny');
  const formNameEl = document.getElementById('detailFormName');
  const cryHintEl = detail.querySelector('.cry-hint');

  if (!cardEl || !flipEl || !normalImageEl || !shinyImageEl || !formNameEl) return;

  // 1. Guardar el estado actual de shiny para mantenerlo al cambiar de forma
  const currentIsShiny = flipEl.dataset.isShiny === 'true';

  // 2. Calcular la siguiente forma
  currentDetailFormIndex = (currentDetailFormIndex + 1) % currentDetailRegionalForms.length;
  const nextForm = currentDetailRegionalForms[currentDetailFormIndex];

  // 3. Iniciar animación de rotación (CSS Flip)
  cardEl.classList.add('is-flipping-form');
  flipEl.style.transform = 'rotateY(180deg)';

  // 4. Cambiar los datos a mitad de la animación (290ms es la mitad de 580ms aprox)
  setTimeout(() => {
    normalImageEl.src = nextForm.image;
    normalImageEl.alt = nextForm.label;
    shinyImageEl.src = nextForm.shinyImage || nextForm.image;
    shinyImageEl.alt = `${nextForm.label} shiny`;
    
    formNameEl.textContent = nextForm.label;
    cardEl.dataset.crySrc = nextForm.cry;

    // Actualizar estado de audio   
    cardEl.classList.toggle('is-clickable', Boolean(nextForm.cry));
    cardEl.classList.toggle('is-silent', !nextForm.cry);
    cardEl.disabled = !nextForm.cry;
    
    if (cryHintEl) {
      cryHintEl.textContent = nextForm.cry ? 'Rugido' : 'Sin audio';
    }

    // 5. Quitar la rotación para que vuelva al frente con la nueva imagen
    flipEl.style.transform = '';
    cardEl.classList.remove('is-flipping-form');
  }, 290);
}

function renderTypeBadges(types) {
  if (!types.length) {
    return '<span class="type-empty">Sin datos</span>';
  }

  return types.map((type) => `
    <span class="type-badge" style="${getTypeTheme([type])}">${type}</span>
  `).join('');
}

function getTypeTheme(types) {
  const primary = typeColors[types[0]] || typeColors.normal;
  const secondary = typeColors[types[1]] || primary;

  return [
    `--type-primary: ${primary.base}`,
    `--type-secondary: ${secondary.base}`,
    `--type-accent: ${primary.accent}`,
    `--type-glow: ${primary.glow}`,
    `--type-text: ${getContrastColor(primary.base)}`
  ].join('; ');
}

function extractPokemonMedia(pokemon) {
  const homeArtwork = pokemon.sprites.other.home?.front_default;
  const homeShinyArtwork = pokemon.sprites.other.home?.front_shiny;
  const officialArtwork = pokemon.sprites.other['official-artwork']?.front_default;
  const officialShinyArtwork = pokemon.sprites.other['official-artwork']?.front_shiny;
  const defaultSprite = pokemon.sprites.front_default;
  const shinySprite = pokemon.sprites.front_shiny;

  return {
    image: homeArtwork || officialArtwork || defaultSprite,
    shinyImage: homeShinyArtwork || officialShinyArtwork || shinySprite || homeArtwork || officialArtwork || defaultSprite,
    sprite: pokemon.sprites.other.showdown?.front_default || homeArtwork || defaultSprite || officialArtwork,
    cry: pokemon.cries?.latest || pokemon.cries?.legacy || ''
  };
}

function getContrastColor(hex) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? '#1a1320' : '#fdf8f2';
}

// ---------------------------------------------------------------------------
// Calculos de combate y evolucion
// ---------------------------------------------------------------------------

function buildTypeEffectiveness(typeData) {
  const multiplierMap = new Map();

  typeData.forEach((type) => {
    type.damage_relations.double_damage_from.forEach((item) => {
      updateMultiplier(multiplierMap, item.name, 2);
    });
    type.damage_relations.half_damage_from.forEach((item) => {
      updateMultiplier(multiplierMap, item.name, 0.5);
    });
    type.damage_relations.no_damage_from.forEach((item) => {
      updateMultiplier(multiplierMap, item.name, 0);
    });
  });

  const weaknesses = [];
  const resistances = [];

  [...multiplierMap.entries()].forEach(([type, value]) => {
    if (value > 1) {
      weaknesses.push(type);
    } else if (value > 0 && value < 1) {
      resistances.push(type);
    }
  });

  return {
    weaknesses: weaknesses.sort(),
    resistances: resistances.sort()
  };
}

function updateMultiplier(map, type, factor) {
  const current = map.has(type) ? map.get(type) : 1;
  map.set(type, factor === 0 ? 0 : current * factor);
}

async function fetchRegionalForms(species, basePokemon) {
  const regionalVarieties = species.varieties.filter((variety) =>
    /-(alola|galar|hisui|paldea)$/.test(variety.pokemon.name)
  );

  const forms = await Promise.all(
    regionalVarieties.map(async (variety) => {
      const response = await fetch(variety.pokemon.url);
      const formPokemon = await response.json();
      const media = extractPokemonMedia(formPokemon);

      return {
        id: formPokemon.id,
        label: formatRegionalLabel(formPokemon.name),
        image: media.image,
        shinyImage: media.shinyImage,
        cry: media.cry
      };
    })
  );

  return [
    {
      id: basePokemon.id,
      label: 'Base',
      image: basePokemon.image,
      shinyImage: basePokemon.shinyImage,
      cry: basePokemon.cry
    },
    ...forms
  ];
}

function buildEvolutionSteps(chain) {
  const steps = [];

  function walk(node, requirement = 'Base') {
    const id = getPokemonIdFromUrl(node.species.url);
    const pokemon = allPokemon.find((item) => item.id === id);

    steps.push({
      id,
      name: node.species.name,
      sprite: pokemon?.sprite || pokemon?.image || '',
      requirement
    });

    node.evolves_to.forEach((evolution) => {
      const details = evolution.evolution_details[0] || {};
      walk(evolution, formatEvolutionRequirement(details));
    });
  }

  walk(chain);
  return steps;
}

function formatEvolutionRequirement(details) {
  if (details.min_level) {
    return `Nivel ${details.min_level}`;
  }
  if (details.trigger?.name === 'trade') {
    return 'Intercambio';
  }
  if (details.item?.name) {
    return `Piedra ${formatLabel(details.item.name)}`;
  }
  if (details.min_happiness) {
    return `Amistad ${details.min_happiness}+`;
  }
  if (details.held_item?.name) {
    return `Objeto ${formatLabel(details.held_item.name)}`;
  }
  return formatLabel(details.trigger?.name || 'Condicion especial');
}

// ---------------------------------------------------------------------------
// Utilidades de formato
// ---------------------------------------------------------------------------

function getSelectedRegion(regionValue) {
  return regionValue === 'all'
    ? allRegionsOption
    : (regions[Number(regionValue)] || regions[151]);
}

function formatStatName(name) {
  const labels = {
    hp: 'PS',
    attack: 'Ataque',
    defense: 'Defensa',
    'special-attack': 'Ataque esp.',
    'special-defense': 'Defensa esp.',
    speed: 'Velocidad'
  };

  return labels[name] || name;
}

function formatLabel(value) {
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRegionalLabel(name) {
  const labels = {
    alola: 'Alola',
    galar: 'Galar',
    hisui: 'Hisui',
    paldea: 'Paldea'
  };

  const regionalSuffix = name.match(/-(alola|galar|hisui|paldea)$/);
  if (!regionalSuffix) {
    return formatLabel(name);
  }

  return labels[regionalSuffix[1]] || formatLabel(regionalSuffix[1]);
}

function getPokemonIdFromUrl(url) {
  return Number(url.split('/').filter(Boolean).pop());
}

// ---------------------------------------------------------------------------
// Eventos y arranque
// ---------------------------------------------------------------------------

searchInput.addEventListener('input', applyFilters);
typeFilter.addEventListener('change', applyFilters);
generationFilter.addEventListener('change', () => fetchPokemon(generationFilter.value));
closeDialog.addEventListener('click', () => dialog.close());

document.querySelectorAll('.view-switch button').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

window.openPokemon = openPokemon;
window.playPokemonCry = playPokemonCry;
window.playCurrentDetailCry = playCurrentDetailCry;
window.togglePokemonShiny = togglePokemonShiny;
window.toggleRegionalForm = toggleRegionalForm;

fetchPokemon(generationFilter.value);

// Registrar el service worker al cargar deja la PWA lista para cache e instalacion.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
