document.addEventListener('DOMContentLoaded', () => {
	const input = document.getElementById('email');
	const btn = document.getElementById('btnSearch');
	const carte = document.querySelector('.carte');
	const imgEl = document.querySelector('.carte .img img');
	const titleEl = document.querySelector('.carte .text h1');
	const descEl = document.querySelector('.carte .text p');
	let timeEl = document.querySelector('.carte .text .time');
	let timeIntervalId = null;

	async function searchBtn() {
		try {
			const q = (input && input.value || '').trim();
			if (!q) {
				if (carte) carte.style.display = 'none';
				return;
			}

			const res = await fetch('./assets/js/travel_recommendation_api.json');
			if (!res.ok) throw new Error('Impossible de charger les données');
			const data = await res.json();

			const qLower = q.toLowerCase();
			// helpers to render multiple recommendations inside .carte
			function clearCarteForList() {
				// remove previous content and create a list container
				carte.innerHTML = '';
				const list = document.createElement('div');
				list.className = 'list';
				carte.appendChild(list);
				carte.style.display = 'block';
				return list;
			}

			function renderList(items) {
				const list = clearCarteForList();
				if (!items || !items.length) return;
				// ensure at least two recommendations shown; show up to 6
				items.slice(0, 6).forEach(it => {
					const item = document.createElement('div');
					item.className = 'result-item';
					const img = document.createElement('img');
					img.src = it.imageUrl || './assets/css/images/affiche.jpg';
					img.alt = it.name || '';
					const txt = document.createElement('div');
					txt.className = 'text';
					const h = document.createElement('h3');
					h.textContent = it.name || '';
					const p = document.createElement('p');
					p.textContent = it.description || '';
					txt.appendChild(h);
					txt.appendChild(p);
					item.appendChild(img);
					item.appendChild(txt);
					list.appendChild(item);
				});
			}

			// handle keyword searches first: beach, temple, country
			if (qLower.includes('beach') || qLower.includes('beaches')) {
				renderList((data.beaches || []).map(b => ({ name: b.name, imageUrl: b.imageUrl, description: b.description })));
				return;
			}

			if (qLower.includes('temple') || qLower.includes('temples')) {
				renderList((data.temples || []).map(t => ({ name: t.name, imageUrl: t.imageUrl, description: t.description })));
				return;
			}

			if (qLower.includes('country') || qLower.includes('countries')) {
				const items = (data.countries || []).map(c => ({
					name: c.name,
					imageUrl: (c.cities && c.cities[0] && c.cities[0].imageUrl) || './assets/css/images/affiche.jpg',
					description: (c.cities && c.cities[0] && c.cities[0].description) || ''
				}));
				renderList(items);
				return;
			}

			const country = (data.countries || []).find(c => c.name.toLowerCase().startsWith(qLower) || c.name.toLowerCase().includes(qLower));

			if (!country) {
				if (carte) carte.style.display = 'none';
				alert('Aucun résultat trouvé pour "' + q + '"');
				return;
			}

			const city = (country.cities && country.cities[0]) || {};
			const imageUrl = city.imageUrl || '';
			let capital = city.name || '';
			if (capital && capital.includes(',')) capital = capital.split(',')[0].trim();


			if (imgEl && imageUrl) imgEl.src = imageUrl;
			if (imgEl && imageUrl) imgEl.alt = city.name || country.name;

			// afficher le champ `name` tel qu'il figure dans le JSON (ex. "Sydney, Australia")
			if (titleEl) titleEl.textContent = city.name || country.name;

			if (descEl) descEl.textContent = city.description || '';

			// determine a timezone string for the country/city
			function getTimeZone(countryName, cityName) {
				const c = (countryName || '').toLowerCase();
				const city = (cityName || '').toLowerCase();
				if (city.includes('sydney') || c === 'australia') return 'Australia/Sydney';
				if (city.includes('melbourne')) return 'Australia/Melbourne';
				if (city.includes('tokyo') || c === 'japan') return 'Asia/Tokyo';
				if (city.includes('kyoto')) return 'Asia/Tokyo';
				if (city.includes('rio') || c === 'brazil') return 'America/Sao_Paulo';
				if (city.includes('são paulo') || city.includes('sao paulo')) return 'America/Sao_Paulo';
				// fallback
				return 'UTC';
			}

			function formatTimeForZone(tz) {
				const options = { timeZone: tz, hour12: true, hour: 'numeric', minute: 'numeric', second: 'numeric' };
				try {
					return new Date().toLocaleTimeString('en-US', options);
				} catch (e) {
					return new Date().toUTCString();
				}
			}

			// clear previous interval if any
			if (timeIntervalId) {
				clearInterval(timeIntervalId);
				timeIntervalId = null;
			}

			const tz = getTimeZone(country.name, city.name);
			if (!timeEl) {
				timeEl = document.createElement('div');
				timeEl.className = 'time';
				titleEl.parentNode.insertBefore(timeEl, descEl);
			}
			timeEl.textContent = 'Time: ' + formatTimeForZone(tz);
			// update every second
			timeIntervalId = setInterval(() => {
				if (timeEl) timeEl.textContent = 'Time: ' + formatTimeForZone(tz);
			}, 1000);

			if (carte) carte.style.display = 'block';
		} catch (err) {
			console.error(err);
			alert('Erreur lors de la recherche. Voir la console.');
		}
	}

	if (btn) btn.addEventListener('click', searchBtn);
	if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchBtn(); });

	// clear button logic
	const clearBtn = document.getElementById('btnClear');
	function clearResults() {
		if (input) input.value = '';
		// stop and remove time updater
		if (timeIntervalId) {
			clearInterval(timeIntervalId);
			timeIntervalId = null;
		}
		// hide carte and clear its content
		if (carte) {
			carte.style.display = 'none';
			// optionally clear inner content if it's a list
			// keep original structure if needed
			try { carte.innerHTML = `<div class="img"><img src="./assets/css/images/affiche.jpg" alt="" width="400px" height="250px"></div><div class="text"><h1>French, paris</h1><p>Lorem, ipsum dolor sit amet consectetur adipisicing elit.<br>Molestiae illum vel voluptatum quam neque quaerat quod laboriosam</p><button>visit</button></div>`; } catch (e) { /* ignore */ }
		}
		// remove any dynamic time element
		const t = document.querySelector('.carte .text .time');
		if (t && t.parentNode) t.parentNode.removeChild(t);
	}

	if (clearBtn) clearBtn.addEventListener('click', clearResults);

	// expose function globally si besoin
	window.searchBtn = searchBtn;
	window.clearResults = clearResults;
});

