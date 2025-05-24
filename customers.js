// Charger les données une seule fois
d3.csv("DataVizCleanedFileV06.csv", d3.autoType)
  .then(data => {
    // Utiliser les mêmes données pour toutes les visualisations
    segmenterClients(data);
    afficherBarresEmpilees(data);
    afficherPieEngagementParGenre(data);
    afficherHeatmapFrequenceVsSensibilite(data);
    afficherStackedBarCategorieParStatut(data);
  })
  .catch(error => {
    console.error("Erreur de chargement des données:", error);
    alert("Une erreur est survenue lors du chargement des données. Veuillez réessayer.");
  });

// Fonction de segmentation des clients
function segmenterClients(data) {
  // Vérifier si des données sont disponibles
  if (!data || data.length === 0) {
    console.error("Aucune donnée disponible pour la segmentation");
    return;
  }

  // Coloration par segment
  const colorScale = d => {
    // Utiliser les chaînes exactes d'après le CSV : en minuscules
    const sens = d.Discount_Sensitivity?.trim().toLowerCase();

    if (d.Frequency_of_Purchase >= 8 && d.Purchase_Amount >= 200 && sens === "not sensitive") {
      return "#1f77b4"; // Loyal High Spenders
    } else if (sens === "very sensitive" && d.Frequency_of_Purchase >= 4) {
      return "#ff7f0e"; // Bargain Seekers
    } else if (d.Frequency_of_Purchase <= 3 && d.Purchase_Amount >= 200) {
      return "#2ca02c"; // Infrequent High Spenders
    }
    return "#ccc"; // Autres
  };

  // Dimensions
  const width = 600, height = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Nettoyer le conteneur existant
  const container = d3.select("#segmentation-chart");
  container.selectAll("*").remove();

  // Créer le SVG
  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Ajouter un fond gris clair
  svg.append("rect")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "#f0f0f0");

  // Créer un groupe pour le contenu
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Échelles
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Frequency_of_Purchase))
    .nice()
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Purchase_Amount))
    .nice()
    .range([innerHeight, 0]);

  // Axes
  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x).ticks(10))
    .append("text")
    .attr("x", innerWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .style("text-anchor", "middle")
    .text("Fréquence d'achat");

  g.append("g")
    .call(d3.axisLeft(y).ticks(10))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -40)
    .attr("x", -innerHeight / 2)
    .attr("fill", "black")
    .style("text-anchor", "middle")
    .text("Montant des achats");

  // Points
  g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.Frequency_of_Purchase))
    .attr("cy", d => y(d.Purchase_Amount))
    .attr("r", 4)
    .attr("fill", colorScale)
    .attr("opacity", 0.7)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("r", 6); // Agrandissement au survol
    })
    .on("mouseout", function() {
      d3.select(this).attr("r", 4);
    });
}

function afficherBarresEmpilees(data) {
// Regroupement des données par niveau d'éducation puis par niveau de revenu
const grouped = d3.group(data, d => d.Education_Level, d => d.Income_Level);

// Extraction des niveaux uniques pour les axes
const incomeLevels = Array.from(new Set(data.map(d => d.Income_Level)));
const educationLevels = Array.from(new Set(data.map(d => d.Education_Level)));

// Préparation des données pour l'empilement (structure à plat)
const stackedData = educationLevels.map(edu => {
  const entry = { Education_Level: edu };
  incomeLevels.forEach(inc => {
    entry[inc] = grouped.get(edu)?.get(inc)?.length || 0;
  });
  return entry;
});

// Construction de la structure empilée avec D3
const stack = d3.stack().keys(incomeLevels);
const series = stack(stackedData);

// Définition des dimensions du graphique
const margin = { top: 40, right: 20, bottom: 60, left: 60 };
const width = 500 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Création du canevas SVG
const svg = d3.select("#bar-education")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Axes X et Y
const x = d3.scaleBand().domain(educationLevels).range([0, width]).padding(0.2);
const y = d3.scaleLinear()
  .domain([0, d3.max(series, s => d3.max(s, d => d[1]))])
  .nice()
  .range([height, 0]);

// Échelle de couleurs pour les catégories de revenu
const color = d3.scaleOrdinal().domain(incomeLevels).range(d3.schemeCategory10);

// Ajout des axes
svg.append("g").call(d3.axisLeft(y));
svg.append("g")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(x))
  .selectAll("text")
  .attr("transform", "rotate(-25)")
  .style("text-anchor", "end");

// Création d'un tooltip personnalisé
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("padding", "6px 10px")
  .style("background", "#333")
  .style("color", "#fff")
  .style("border-radius", "6px")
  .style("font-size", "0.85rem")
  .style("pointer-events", "none")
  .style("opacity", 0);

// Dessin des barres empilées avec interactivité (tooltip)
svg.selectAll("g.layer")
  .data(series)
  .enter().append("g")
  .attr("fill", d => color(d.key))
  .selectAll("rect")
  .data(d => d.map(v => ({ ...v, key: d.key })))
  .enter().append("rect")
  .attr("x", d => x(d.data.Education_Level))
  .attr("y", d => y(d[1]))
  .attr("height", d => y(d[0]) - y(d[1]))
  .attr("width", x.bandwidth())
  .on("mouseover", (event, d) => {
    tooltip.transition().duration(200).style("opacity", 1);
    tooltip.html(`
      <strong>Éducation :</strong> ${d.data.Education_Level}<br>
      <strong>Revenu :</strong> ${d.key}<br>
      <strong>Nombre :</strong> ${d.data[d.key]}
    `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 30) + "px");
  })
  .on("mousemove", event => {
    tooltip.style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 30) + "px");
  })
  .on("mouseout", () => {
    tooltip.transition().duration(200).style("opacity", 0);
  });
}

function afficherPieEngagementParGenre(data) {
  // Définition des dimensions du SVG et du rayon du camembert
  const width = 400, height = 300, radius = Math.min(width, height) / 2;

  // Création d'un tooltip HTML invisible au départ pour afficher les infos au survol
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "8px")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("opacity", 0);  // le tooltip est caché par défaut

  // Création du conteneur SVG et centrage du groupe principal
  const svg = d3.select("#pie-engagement-by-gender")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // Échelle de couleurs pour les différentes tranches
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Générateur de diagramme en camembert basé sur les valeurs
  const pie = d3.pie().value(d => d.value);

  // Générateur d’arcs pour dessiner les tranches
  const arc = d3.arc().innerRadius(0).outerRadius(radius - 10);

  // Fonction pour créer ou mettre à jour le graphique selon le genre sélectionné
  function updatePie(selectedGender) {
    // Suppression des anciennes tranches et étiquettes
    svg.selectAll("path").remove();
    svg.selectAll("text").remove();

    // Filtrage des données en fonction du genre sélectionné
    const filteredData = selectedGender === "all"
      ? data
      : data.filter(d => d.Gender === selectedGender);

    // Regroupement et comptage du nombre de clients par niveau d'engagement avec les publicités
    const engagementCount = d3.rollup(
      filteredData,
      v => v.length,
      d => d.Engagement_with_Ads
    );

    // Conversion des données agrégées en tableau exploitable par D3 pie
    const dataReady = Array.from(engagementCount, ([key, value]) => ({ key, value }));

    // Calcul des arcs à partir des données
    const arcs = pie(dataReady);

    // Dessin des tranches du camembert
    svg.selectAll("path")
      .data(arcs)
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.key)) // couleur par clé d'engagement
      .on("mouseover", (event, d) => {
        // Affichage du tooltip au survol
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(`<strong>${d.data.key}</strong><br>${d.data.value} clients`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", event => {
        // Mise à jour de la position du tooltip avec la souris
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        // Disparition du tooltip lorsque la souris quitte la tranche
        tooltip.transition().duration(300).style("opacity", 0);
      });

    // Ajout d’étiquettes de texte au centre de chaque tranche
    svg.selectAll("text.label")
      .data(arcs)
      .enter()
      .append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .text(d => d.data.key);
  }

  // Affichage initial avec toutes les données (pas de filtrage par genre)
  updatePie("all");

  // Mise à jour du graphique lorsqu’un genre est sélectionné dans la liste déroulante
  d3.select("#genre-select").on("change", function () {
    const selected = this.value;
    updatePie(selected);
  });
}



function afficherHeatmapFrequenceVsSensibilite(data) {
  const margin = { top: 50, right: 30, bottom: 70, left: 100 },
        width = 500 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#heatmap-frequency-discount")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const freqValues = Array.from(new Set(data.map(d => d.Frequency_of_Purchase))).sort((a, b) => a - b);
  const sensValues = Array.from(new Set(data.map(d => d.Discount_Sensitivity))).sort();

  const x = d3.scaleBand()
    .domain(freqValues)
    .range([0, width])
    .padding(0.05);

  const y = d3.scaleBand()
    .domain(sensValues)
    .range([height, 0])
    .padding(0.05);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .style("text-anchor", "end");

  svg.append("g")
    .call(d3.axisLeft(y));

  const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolateBlues)
    .domain([20, 45]);

  const heatData = d3.rollups(
    data,
    v => v.length,
    d => d.Frequency_of_Purchase,
    d => d.Discount_Sensitivity
  );

  const formattedData = [];
  for (const [freq, entries] of heatData) {
    for (const [sens, count] of entries) {
      formattedData.push({ freq, sens, count });
    }
  }

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "8px")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Rectangles
  svg.selectAll()
    .data(formattedData)
    .enter()
    .append("rect")
    .attr("x", d => x(d.freq))
    .attr("y", d => y(d.sens))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", d => colorScale(d.count))
    .style("stroke", "#fff")
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`Fréquence: <strong>${d.freq}</strong><br>Sensibilité: <strong>${d.sens}</strong><br>Clients: <strong>${d.count}</strong>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      d3.select(this).style("stroke", "#000");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(300).style("opacity", 0);
      d3.select(this).style("stroke", "#fff");
    });

  // Labels dans les carreaux
  svg.selectAll()
    .data(formattedData)
    .enter()
    .append("text")
    .attr("x", d => x(d.freq) + x.bandwidth() / 2)
    .attr("y", d => y(d.sens) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .style("fill", d => d.count >= 30 ? "#fff" : "#000") // contraste
    .style("font-size", "12px")
    .text(d => d.count);

  // Titre
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Fréquence d'Achat vs. Sensibilité aux Promotions");
}

function afficherStackedBarCategorieParStatut(data) {
  // Regroupe les données par catégorie d'achat puis par statut marital
  const grouped = d3.group(data, d => d.Purchase_Category, d => d.Marital_Status);

  // Liste des catégories d'achat uniques
  const categories = Array.from(new Set(data.map(d => d.Purchase_Category)));

  // Liste des statuts maritaux uniques
  const maritalStatuses = Array.from(new Set(data.map(d => d.Marital_Status)));

  // Préparation des données dans un format exploitable pour la pile (stack)
  const stackedData = categories.map(cat => {
    const entry = { Purchase_Category: cat };
    // Pour chaque statut marital, on compte le nombre d’occurrences dans chaque catégorie
    maritalStatuses.forEach(status => {
      entry[status] = grouped.get(cat)?.get(status)?.length || 0;
    });
    return entry;
  });

  // Création de la pile (stack) basée sur les statuts maritaux
  const stack = d3.stack().keys(maritalStatuses);
  const series = stack(stackedData); // Données empilées prêtes à être affichées

  // Dimensions et marges du graphique
  const margin = { top: 40, right: 20, bottom: 80, left: 60 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Création de l’élément SVG principal
  const svg = d3.select("#stacked-marital-purchase")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Échelle en X : les catégories d’achat
  const x = d3.scaleBand()
    .domain(categories)
    .range([0, width])
    .padding(0.2);

  // Échelle en Y : nombre total d’achats (somme empilée)
  const y = d3.scaleLinear()
    .domain([0, d3.max(series, s => d3.max(s, d => d[1]))]) // maximum de la somme empilée
    .nice()
    .range([height, 0]);

  // Échelle de couleurs pour les statuts maritaux
  const color = d3.scaleOrdinal()
    .domain(maritalStatuses)
    .range(d3.schemeSet2);

  // Ajout de l’axe Y (à gauche)
  svg.append("g").call(d3.axisLeft(y));

  // Ajout de l’axe X (en bas), avec rotation des étiquettes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .style("text-anchor", "end");

  // Création d’un tooltip (infobulle)
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "6px")
    .style("background", "#333")
    .style("color", "#fff")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Dessin des rectangles pour chaque série (par statut marital)
  svg.selectAll("g.layer")
    .data(series)
    .enter()
    .append("g")
    .attr("fill", d => color(d.key)) // couleur selon le statut
    .selectAll("rect")
    .data(d => d)
    .enter()
    .append("rect")
    .attr("x", d => x(d.data.Purchase_Category)) // position horizontale
    .attr("y", d => y(d[1])) // sommet du rectangle (valeur empilée)
    .attr("height", d => y(d[0]) - y(d[1])) // hauteur = différence entre haut et bas de la pile
    .attr("width", x.bandwidth()) // largeur selon l’échelle X
    .on("mouseover", function (event, d) {
      const status = d3.select(this.parentNode).datum().key; // statut marital actuel
      tooltip.transition().duration(100).style("opacity", 1);
      tooltip.html(`Statut: ${status}<br>Nombre: ${d[1] - d[0]}`) // valeur affichée
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));
}

