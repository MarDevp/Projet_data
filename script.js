// Chargement des données à partir d'un fichier CSV
d3.csv("DataVizCleanedFileV06.csv", function(d) {

  // Conversion de la date d'achat en objet Date JS
  const date = new Date(d.Time_of_Purchase);

  // Normalisation du champ "Gender" (mise en minuscule + classification en "male", "female", ou "other")
  const gender = d.Gender.toLowerCase();
  const normalizedGender = (gender === "male" || gender === "female") ? gender : "other";

  // Prétraitement : conversion des champs numériques et ajout de nouvelles colonnes
  return {
    ...d, // garde tous les champs initiaux
    Age: +d.Age, // conversion explicite en nombre
    Time_Spent_on_Product_Research: +d.Time_Spent_on_Product_Research, // idem
    // Ajout d'un champ "DayOfMonth" (1 → 31) à partir de la date
    DayOfMonth: date.getDate(),
    // Ajout du nom du mois (en anglais, ex: "March")
    Month: date.toLocaleString("en-US", { month: "long" }),
    // Ajout du genre normalisé
    Normalized_Gender: normalizedGender
  };

}).then(data => {
  // Une fois les données chargées et traitées, les afficher dans la console
  console.log("Données prétraitées :", data);

  // Appel des fonctions d'affichage de chaque visualisation
  afficherKPIs(data);                  
  afficherDonutGenre(data);   
  afficherBarCategorie(data);           
  afficherBarAgeFrequency(data);       
  afficherHeatmapRechercheIntent(data); 
  afficherBarRetourParCategorie(data);     
  afficherHeatmapJourMois(data);       
});

// Fonction pour les catégories avec plus de retours
function afficherBarRetourParCategorie(data) {
  const margin = {top: 30, right: 30, bottom: 70, left: 60};
  const width = 500 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  // Nettoyer le conteneur
  d3.select("#bar-return-categories").html("");

  // Créer le SVG
  const svg = d3.select("#bar-return-categories")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Grouper et trier les données
  const groupedReturns = d3.rollups(
    data,
    v => d3.mean(v, d => d.Return_Rate),
    d => d.Purchase_Category
  )
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10); // Limiter aux 10 premières catégories pour meilleure lisibilité

  // Échelles
  const x = d3.scaleBand()
    .domain(groupedReturns.map(d => d[0]))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(groupedReturns, d => d[1]) * 1.1]) // +10% pour l'espace
    .nice()
    .range([height, 0]);

  // Axe X avec rotation des étiquettes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em");

  // Axe Y avec format pourcentage
  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

  // Barres avec effet de survol
  const bars = svg.selectAll(".bar")
    .data(groupedReturns)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d[0]))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d[1]))
    .attr("height", d => height - y(d[1]))
    .attr("fill", "#59a14f")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", "#2e7d32"); // Couleur plus foncée au survol
      
      // Afficher le tooltip
      const tooltip = d3.select("#tooltip-gender");
      tooltip
        .style("display", "block")
        .style("opacity", 1)
        .html(`<strong>${d[0]}</strong><br>Taux de retour: ${(d[1] * 100).toFixed(1)}%`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("fill", "#59a14f"); // Rétablir la couleur originale
      d3.select("#tooltip-gender")
        .style("opacity", 0)
        .style("display", "none");
    });

  // Titre du graphique
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Taux de retour moyen par catégorie");

  // Étiquette axe Y
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Taux de retour");
}   
   // Fonction pour la fréquence d'achat par âge
      function afficherBarAgeFrequency(data) {
        const margin = {top: 30, right: 30, bottom: 50, left: 60};
        const width = 500 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;
  
        // Nettoyer les conteneurs
        d3.select("#bar-age-frequency-filter").html("");
        d3.select("#bar-age-frequency").html("");
  
        // Créer le menu de filtre
        const genres = Array.from(new Set(data.map(d => d.Normalized_Gender))).sort();
        const select = d3.select("#bar-age-frequency-filter")
          .append("select")
          .on("change", function() {
            updateChart(this.value);
          });
  
        select.append("option").text("Tous les genres").attr("value", "all");
        genres.forEach(g => {
          select.append("option")
            .text(g === "male" ? "Hommes" : g === "female" ? "Femmes" : "Autre")
            .attr("value", g);
        });
  
        // Créer le SVG
        const svg = d3.select("#bar-age-frequency")
          .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);
  
        // Échelles
        const x = d3.scaleBand().padding(0.2).range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);
  
        // Axes
        const xAxis = svg.append("g")
          .attr("transform", `translate(0,${height})`);
  
        const yAxis = svg.append("g");
  
        // Tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("opacity", 0);
  
        function updateChart(selectedGender) {
          // Filtrer les données
          const filtered = selectedGender === "all" 
            ? data 
            : data.filter(d => d.Normalized_Gender === selectedGender);
  
          // Grouper par âge et calculer la fréquence moyenne
          const grouped = d3.rollups(
            filtered,
            v => d3.mean(v, d => d.Frequency_of_Purchase),
            d => d.Age
          ).map(([age, freq]) => ({age, freq}))
          .sort((a, b) => a.age - b.age);
  
          // Mettre à jour les échelles
          x.domain(grouped.map(d => d.age));
          y.domain([0, d3.max(grouped, d => d.freq)]).nice();
  
          // Mettre à jour les axes
          xAxis.transition().duration(500).call(d3.axisBottom(x));
          yAxis.transition().duration(500).call(d3.axisLeft(y));
  
          // Mettre à jour les barres
          const bars = svg.selectAll("rect")
            .data(grouped, d => d.age);
  
          bars.enter()
            .append("rect")
            .attr("x", d => x(d.age))
            .attr("width", x.bandwidth())
            .attr("fill", "#4e79a7")
            .on("mouseover", function(event, d) {
              tooltip.transition().duration(200).style("opacity", 0.9);
              tooltip.html(`Âge: ${d.age}<br>Fréquence: ${d.freq.toFixed(2)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
              tooltip.transition().duration(500).style("opacity", 0);
            })
            .merge(bars)
            .transition().duration(500)
            .attr("y", d => y(d.freq))
            .attr("height", d => height - y(d.freq));
  
          bars.exit().remove();
        }
  
        // Affichage initial
        updateChart("all");
      }
  
  
// Fonction pour calculer et afficher les KPIs
function afficherKPIs(data) {
  // Nombre total de clients (taille du dataset)
  const totalClients = data.length;

  // Calcul du panier moyen à partir de la colonne Purchase_Amount
  const panierMoyen = d3.mean(data, d => d.Purchase_Amount);

  // Calcul du taux de retour moyen à partir de la colonne Return_Rate
  const retourMoyen = d3.mean(data, d => d.Return_Rate);

  // Calcul de la satisfaction moyenne à partir de la colonne Customer_Satisfaction
  const satisfactionMoyenne = d3.mean(data, d => d.Customer_Satisfaction);

  // Nombre de membres du programme de fidélité (valeur booléenne transformée en chaîne, mise en minuscule pour éviter les erreurs)
  const membresFidélité = data.filter(d => String(d.Customer_Loyalty_Program_Member).toLowerCase() === "true").length;
  console.log("Membres fidélité :", membresFidélité);

  // Calcul du pourcentage de membres fidélité
  const pourcentageFidélité = (membresFidélité / totalClients) * 100;

  // Construction d'un tableau d'objets représentant chaque KPI à afficher
  const kpis = [
    { label: " Nombre total de clients", value: totalClients },
    { label: " Panier moyen (€)", value: panierMoyen.toFixed(2) },
    { label: " Taux de retour moyen", value: retourMoyen.toFixed(2) },
    { label: " Satisfaction moyenne", value: satisfactionMoyenne.toFixed(2) },
    { label: " Membres fidélité (%)", value: pourcentageFidélité.toFixed(1) + "%" }
  ];

  // Sélection du conteneur HTML (doit avoir id="kpi-cards")
  const container = d3.select("#kpi-cards");

  // Liaison des données KPI avec des divs, création dynamique de chaque carte KPI
  container.selectAll(".kpi")
    .data(kpis)
    .enter()
    .append("div")
    .attr("class", "kpi") // classe CSS pour le style des KPI
    .html(d => `<h3>${d.label}</h3><p><strong>${d.value}</strong></p>`); // contenu HTML de chaque carte
}

  
  function afficherDonutGenre(data) {
    // Dimensions et rayon du donut
    const width = 300, height = 300, radius = Math.min(width, height) / 2;
  
    // Création du SVG et centrage du groupe principal
    const svg = d3.select("#donut-gender")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);
  
    // Échelle de couleurs selon le genre (male, female, other)
    const color = d3.scaleOrdinal()
      .domain(["male", "female", "other"])
      .range(["#4e79a7", "#f28e2b", "#e15759"]);
  
    // Générateur de layout pour le graphique en donut (pie chart)
    const pie = d3.pie()
      .value(d => d[1]); // On utilise la valeur de comptage comme valeur d’angle
  
    // Définition des arcs du donut (rayon intérieur et extérieur)
    const arc = d3.arc()
      .innerRadius(radius * 0.5) // Donut creux
      .outerRadius(radius * 0.9);
  
    // Fonction pour mettre à jour le graphique en fonction des données filtrées
    const updateChart = (filteredData) => {
      console.log("Data après filtre:", filteredData); // Debug : données après application du filtre
  
      // Comptage du nombre de clients par genre normalisé
      const counts = d3.rollup(
        filteredData.filter(d => d.Normalized_Gender === "male" || d.Normalized_Gender === "female"),
        v => v.length,
        d => d.Normalized_Gender
      );
      
      console.log("Comptages des genres:", counts); // Debug : affichage du Map
  
      // Préparation des données pour le layout en pie chart
      const data_ready = pie([...counts]); // Transforme la Map en tableau
      console.log("Données après transformation pie:", data_ready); // Debug : données prêtes à être dessinées
  
      // Liaison des données aux éléments <path> existants ou à créer
      const arcs = svg.selectAll("path").data(data_ready);
  
      // Gestion des entrées, mises à jour et sorties
      arcs.join(
        // Nouveaux éléments (enter)
        enter => enter.append("path")
          .attr("d", arc)
          .attr("fill", d => color(d.data[0])) // Couleur selon le genre
          .attr("stroke", "white") // Bordure blanche
          .style("stroke-width", "2px")
          .append("title") // Tooltip initial
          .text(d => `${d.data[0]}: ${d.data[1]}`),
  
        // Éléments mis à jour (update)
        update => update
          .transition()
          .duration(500)
          .attr("d", arc)
          .attr("fill", d => color(d.data[0]))
          .selection() // Reprend la sélection pour modifications hors transition
          .each(function (d) {
            d3.select(this).select("title").remove(); // Supprime l'ancien tooltip
            d3.select(this).append("title").text(d => `${d.data[0]}: ${d.data[1]}`); // Ajoute un nouveau tooltip
          }),
  
        // Suppression des anciens éléments (exit)
        exit => exit.remove()
      );
    };
  
    // --- Remplissage du menu déroulant avec les niveaux d'éducation uniques ---
  
    const educationLevels = Array.from(new Set(data.map(d => d.Education_Level))); // Niveaux uniques
    const select = d3.select("#filter-education"); // Sélection du <select>
  
    // Ajout d'une <option> pour chaque niveau
    educationLevels.forEach(level => {
      select.append("option").attr("value", level).text(level);
    });
  
    // --- Écouteur de changement de filtre ---
  
    select.on("change", function () {
      const value = this.value;
      console.log("Filtre sélectionné:", value); // Debug : filtre choisi
  
      // Filtrage des données selon l'éducation sélectionnée
      const filtered = value === "all"
        ? data
        : data.filter(d => d.Education_Level === value);
      console.log("Données filtrées:", filtered); // Debug : données résultantes
  
      // Mise à jour du graphique avec les données filtrées
      updateChart(filtered);
    });
  
    //  Affichage initial sans filtre ---
    updateChart(data);
  }
  
  
  function afficherBarCategorie(data) {
    // Définition des marges et dimensions du graphique
    const margin = { top: 20, right: 30, bottom: 40, left: 150 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
  
    // Création du conteneur SVG et application des marges internes
    const svg = d3.select("#bar-category")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
    // Regroupement des données par catégorie d'achat
    // Pour chaque catégorie, on calcule le montant total d'achat et le nombre d'achats
    const grouped = Array.from(
      d3.rollup(
        data,
        v => ({
          totalAmount: d3.sum(v, d => d.Purchase_Amount),
          count: v.length
        }),
        d => d.Purchase_Category
      ),
      ([key, value]) => ({ category: key, ...value })
    );
  
    // Création de l'échelle X (linéaire) basée sur le nombre d'achats
    const x = d3.scaleLinear()
      .domain([0, d3.max(grouped, d => d.count)])
      .range([0, width]);
  
    // Création de l'échelle Y (catégorielle) basée sur les noms des catégories
    const y = d3.scaleBand()
      .domain(grouped.map(d => d.category))
      .range([0, height])
      .padding(0.1);
  
    // Création d'une infobulle pour afficher des détails au survol
    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "white")
      .style("padding", "6px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("display", "none");
  
    // Ajout de l'axe Y (catégories) au SVG
    svg.append("g")
      .call(d3.axisLeft(y));
  
    // Ajout de l'axe X (nombre d'achats) au bas du graphique
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x));
  
    // Création des barres du graphique
    svg.selectAll("rect")
      .data(grouped)
      .enter()
      .append("rect")
      .attr("y", d => y(d.category)) // Position verticale
      .attr("width", d => x(d.count)) // Largeur selon la fréquence
      .attr("height", y.bandwidth()) // Hauteur égale pour toutes les barres
      .attr("fill", "#69b3a2") // Couleur des barres
      // Événement de survol : affichage de l'infobulle avec détails
      .on("mouseover", function (event, d) {
        tooltip
          .style("display", "block")
          .html(`
            <strong>${d.category}</strong><br/>
            Total achat: €${d.totalAmount.toFixed(2)}<br/>
            Fréquence: ${d.count}
          `);
      })
      // Mise à jour de la position de l'infobulle quand la souris bouge
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      // Masquage de l'infobulle quand la souris sort de la barre
      .on("mouseout", function () {
        tooltip.style("display", "none");
      });
  }
  
  

  function afficherBarAgeFrequency(data) {
    //  Création d'un menu déroulant pour filtrer selon le genre
    const genres = Array.from(new Set(data.map(d => d.Normalized_Gender))).sort();
    const select = d3.select("#bar-age-frequency-filter")
      .append("select")
      .on("change", () => updateChart(select.property("value"))); // Met à jour le graphique quand l'utilisateur change de genre
  
    //  Option par défaut : afficher tout
    select.append("option").text("Tous").attr("value", "all");
    //  Ajout des genres disponibles dans les options
    genres.forEach(g =>
      select.append("option").text(g.charAt(0).toUpperCase() + g.slice(1)).attr("value", g)
    );
  
    //  Dimensions du graphique
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
  
    //  Création du SVG principal
    const svg = d3.select("#bar-age-frequency")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
    // Échelles pour les axes X (catégoriel) et Y (linéaire)
    const x = d3.scaleBand().padding(0.2).range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);
  
    // Groupes pour les axes (permet de les mettre à jour)
    const xAxis = svg.append("g").attr("transform", `translate(0, ${height})`);
    const yAxis = svg.append("g");
  
    // Création d'un tooltip pour afficher les valeurs au survol
    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("box-shadow", "0 0 5px rgba(0,0,0,0.2)")
      .style("pointer-events", "none")
      .style("opacity", 0);
  
    //  Fonction principale qui met à jour le graphique en fonction du genre sélectionné
    function updateChart(selectedGender) {
      // Filtrage des données selon le genre sélectionné
      let filtered = data;
      if (selectedGender !== "all") {
        filtered = data.filter(d => d.Normalized_Gender === selectedGender);
      }
  
      //  Regroupement par âge avec calcul de la moyenne des fréquences d'achat
      const grouped = d3.rollups(
        filtered,
        v => d3.mean(v, d => +d.Frequency_of_Purchase),
        d => d.Age
      ).map(([age, avgFreq]) => ({ Age: +age, Avg_Frequency: avgFreq }));
  
      //  Tri par âge croissant
      grouped.sort((a, b) => a.Age - b.Age);
  
      //  Mise à jour des domaines des axes
      x.domain(grouped.map(d => d.Age));
      y.domain([0, d3.max(grouped, d => d.Avg_Frequency)]);
  
      //  Affichage des axes
      xAxis.call(d3.axisBottom(x));
      yAxis.call(d3.axisLeft(y));
  
      //  Liaison des données aux barres
      const bars = svg.selectAll("rect").data(grouped, d => d.Age);
  
      // Ajout des nouvelles barres (enter), gestion du survol avec tooltip
      bars.enter()
        .append("rect")
        .attr("x", d => x(d.Age))
        .attr("y", d => y(d.Avg_Frequency))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.Avg_Frequency))
        .attr("fill", "#69b3a2")
        .on("mouseover", function (event, d) {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip
            .html(`Âge : <strong>${d.Age}</strong><br>Fréquence moyenne : <strong>${d.Avg_Frequency.toFixed(2)}</strong>`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
          d3.select(this).attr("fill", "#468f7b");
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
          tooltip.transition().duration(300).style("opacity", 0);
          d3.select(this).attr("fill", "#69b3a2");
        })
        .merge(bars) //  Mise à jour des barres existantes
        .transition().duration(500)
        .attr("x", d => x(d.Age))
        .attr("y", d => y(d.Avg_Frequency))
        .attr("height", d => height - y(d.Avg_Frequency));
  
      // Suppression des anciennes barres (exit)
      bars.exit().remove();
    }
  
    //  Affichage initial sans filtre
    updateChart("all");
  }
  
  
  
  
  
  function afficherHeatmapRechercheIntent(data) {
    // Définir les marges et dimensions de la heatmap
    const margin = { top: 40, right: 30, bottom: 50, left: 120 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
  
    // Créer l'élément SVG et le groupe principal dans lequel on dessinera tout
    const svg = d3.select("#heatmap-correlation")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Fonction pour regrouper le temps de recherche en "buckets"
    const getTimeBucket = (t) => {
      if (t < 1) return "0–1h";
      else if (t < 2) return "1–2h";
      else if (t < 3) return "2–3h";
      else return "4h+"; // tout temps >= 3h est regroupé ici
    };
  
    // Extraire tous les intents uniques
    const intents = Array.from(new Set(data.map(d => d.Purchase_Intent)));
  
    // Définir les catégories de temps fixes (sur l'axe X)
    const allBuckets = ["0–1h", "1–2h", "2–3h", "4h+"];
  
    // Couleur de base des cellules
    const color = "#4682B4";
  
    // Échelle d'opacité utilisée initialement (sera remplacée dynamiquement plus tard)
    const opacityScale = d3.scaleLinear()
      .domain([70, 90]) // plage de nombre de clients
      .range([0.2, 1]); // plus c’est grand, plus c’est opaque
  
    // Remplir le filtre dropdown avec tous les canaux d'achat
    const select = d3.select("#heatmap-filter");
    const channels = Array.from(new Set(data.map(d => d.Purchase_Channel)));
    channels.forEach(ch => {
      select.append("option").attr("value", ch).text(ch);
    });
  
    // Quand l'utilisateur change le filtre
    select.on("change", function () {
      const selected = this.value;
      console.log("Selected filter:", selected);
  
      // Filtrer les données selon la sélection
      const filtered = selected === "all"
        ? data
        : data.filter(d => d.Purchase_Channel.trim() === selected);
      console.log("Filtered data count:", filtered.length);
  
      // Redessiner la heatmap avec les données filtrées
      drawHeatmap(filtered);
    });
  
    // Fonction principale qui construit la heatmap
    function drawHeatmap(filteredData) {
      // Extraire les intents présents dans les données filtrées
      const intents = Array.from(new Set(filteredData.map(d => d.Purchase_Intent)));
  
      // Initialiser une matrice contenant tous les counts par intent et bucket
      const matrix = {};
      intents.forEach(intent => {
        matrix[intent] = {};
        allBuckets.forEach(bucket => {
          matrix[intent][bucket] = 0; // par défaut à 0
        });
      });
  
      // Remplir la matrice avec les données
      filteredData.forEach(d => {
        const bucket = getTimeBucket(d.Time_Spent_on_Product_Research);
        matrix[d.Purchase_Intent][bucket]++;
      });
  
      // Aplatir la matrice pour en faire une liste de points à afficher
      const flatData = [];
      intents.forEach(intent => {
        allBuckets.forEach(bucket => {
          const value = matrix[intent][bucket];
          // Ne pas inclure les buckets vides de "4h+" pour alléger la vue
          if (!(bucket === "4h+" && value === 0)) {
            flatData.push({ intent, bucket, value });
          }
        });
      });
  
      // Si aucune donnée à afficher → message à la place du graphique
      if (flatData.length === 0) {
        svg.selectAll("*").remove();
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .text("Aucune donnée disponible pour ce filtre.");
        return;
      }
  
      // Redéfinir l’échelle d’opacité dynamiquement en fonction des valeurs filtrées
      const values = flatData.map(d => d.value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
  
      const opacityScale = d3.scaleLinear()
        .domain([minValue, maxValue === minValue ? minValue + 1 : maxValue])
        .range([0.2, 1]);
  
      // Déterminer les buckets réellement utilisés (pour l’axe X)
      const usedBuckets = Array.from(new Set(flatData.map(d => d.bucket)));
  
      // Créer les échelles pour les axes
      const x = d3.scaleBand()
        .domain(usedBuckets)
        .range([0, width])
        .padding(0.05);
  
      const y = d3.scaleBand()
        .domain(intents)
        .range([0, height])
        .padding(0.05);
  
      // Nettoyer le graphique avant de redessiner
      svg.selectAll("*").remove();
  
      // Ajouter les axes
      svg.append("g").call(d3.axisLeft(y));
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
  
      // Créer l’élément tooltip
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "6px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("display", "none");
  
      // Dessiner chaque case du heatmap
      svg.selectAll()
        .data(flatData)
        .enter()
        .append("rect")
        .attr("x", d => x(d.bucket))
        .attr("y", d => y(d.intent))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", color)
        .style("fill-opacity", d => opacityScale(d.value)) // opacité selon nombre de clients
        .on("mouseover", function (event, d) {
          tooltip
            .style("display", "block")
            .html(`Intent: <strong>${d.intent}</strong><br/>Recherche: ${d.bucket}<br/>Clients: ${d.value}`);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", function () {
          tooltip.style("display", "none");
        });
    }
  
    // Initialisation : dessiner la heatmap avec toutes les données au début
    drawHeatmap(data);
  }
  

  function afficherAppareilsEtPaiement(data) {
    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
  
    const svg = d3.select("#device-bar")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
    const devices = Array.from(d3.group(data, d => d.Device_Used_for_Shopping), ([key, value]) => ({
      device: key,
      count: value.length
    }));
  
    const x = d3.scaleBand()
      .domain(devices.map(d => d.device))
      .range([0, width])
      .padding(0.2);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(devices, d => d.count)])
      .nice()
      .range([height, 0]);
  
    const color = d3.scaleOrdinal(d3.schemeSet2);
  
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
  
    svg.append("g").call(d3.axisLeft(y));
  
    svg.selectAll("rect")
      .data(devices)
      .enter()
      .append("rect")
      .attr("x", d => x(d.device))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.count))
      .attr("fill", d => color(d.device))
      .on("click", function (event, d) {
        const filtered = data.filter(e => e.Device_Used_for_Shopping === d.device);
        afficherPaiementParAppareil(filtered, d.device);
      });
  
    // Afficher les barres des méthodes de paiement après clic
    function afficherPaiementParAppareil(filteredData, deviceLabel) {
      d3.select("#payment-method-bar").selectAll("*").remove();
  
      const svg2 = d3.select("#payment-method-bar")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
      const paymentCounts = Array.from(d3.group(filteredData, d => d.Payment_Method), ([key, value]) => ({
        method: key,
        count: value.length
      }));
  
      const x2 = d3.scaleBand()
        .domain(paymentCounts.map(d => d.method))
        .range([0, width])
        .padding(0.2);
  
      const y2 = d3.scaleLinear()
        .domain([0, d3.max(paymentCounts, d => d.count)])
        .nice()
        .range([height, 0]);
  
      svg2.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x2));
  
      svg2.append("g").call(d3.axisLeft(y2));
  
      svg2.selectAll("rect")
        .data(paymentCounts)
        .enter()
        .append("rect")
        .attr("x", d => x2(d.method))
        .attr("y", d => y2(d.count))
        .attr("width", x2.bandwidth())
        .attr("height", d => height - y2(d.count))
        .attr("fill", "#69b3a2");
  
      svg2.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(`Méthodes de paiement pour : ${deviceLabel}`);
    }
  }

  function afficherHeatmapJourMois(data) {
    // Définition des marges et dimensions du graphique
    const margin = { top: 50, right: 30, bottom: 50, left: 100 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
  
    // Création des jours du mois (1 à 31) et extraction des mois uniques dans les données
    const days = d3.range(1, 32); // 1 → 31
    const months = [...new Set(data.map(d => d.Month))];
  
    // Création du conteneur SVG dans la div #purchase-heatmap (en vidant son contenu au préalable)
    const svg = d3.select("#purchase-heatmap")
      .html("") // Nettoyer le contenu précédent
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Initialisation d'une matrice pour stocker les montants d'achat pour chaque combinaison mois-jour
    const matrix = {};
    months.forEach(month => {
      matrix[month] = {};
      days.forEach(day => {
        matrix[month][day] = [];
      });
    });
  
    // Remplissage de la matrice avec les montants d'achat
    data.forEach(d => {
      const month = d.Month;
      const day = +d.DayOfMonth;
      const amount = +d.Purchase_Amount;
      if (month && day) matrix[month][day].push(amount);
    });
  
    // Transformation de la matrice en un tableau "plat" contenant les moyennes pour chaque case mois-jour
    const flatData = [];
    months.forEach(month => {
      days.forEach(day => {
        const vals = matrix[month][day];
        const value = vals.length ? d3.mean(vals) : 0; // Moyenne si valeurs présentes, sinon 0
        flatData.push({ month, day, value });
      });
    });
  
    // Définition des échelles pour les axes X (jours) et Y (mois)
    const x = d3.scaleBand().domain(days).range([0, width]).padding(0.05);
    const y = d3.scaleBand().domain(months).range([0, height]).padding(0.05);
  
    // Définition de l'échelle de couleur basée sur les valeurs moyennes
    const maxVal = d3.max(flatData, d => d.value);
    const color = d3.scaleSequential()
      .interpolator(d3.interpolateYlOrRd)
      .domain([0, maxVal]);
  
    // Ajout de l'axe des mois (axe vertical)
    svg.append("g").call(d3.axisLeft(y));
  
    // Ajout de l'axe des jours (axe horizontal)
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x));
  
    // Création d'un tooltip (infobulle) pour afficher les informations au survol
    const tooltip = d3.select("body").append("div")
      .style("position", "absolute")
      .style("background", "white")
      .style("padding", "6px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("display", "none");
  
    // Dessin des cases de la heatmap
    svg.selectAll()
      .data(flatData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.day))
      .attr("y", d => y(d.month))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => color(d.value))
      .on("mouseover", function (event, d) {
        // Affichage du tooltip avec les détails
        tooltip
          .style("display", "block")
          .html(`<strong>${d.month} ${d.day}</strong><br/>Moyenne: ${d.value.toFixed(2)} €`);
      })
      .on("mousemove", function (event) {
        // Mise à jour de la position du tooltip
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mouseout", function () {
        // Masquer le tooltip à la sortie
        tooltip.style("display", "none");
      });
  }
  
  
  