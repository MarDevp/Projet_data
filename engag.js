 // Configuration globale
    const margin = {top: 40, right: 40, bottom: 60, left: 60};
    const baseWidth = 450;
    const baseHeight = 300;
    
    // Fonction pour calculer la largeur dynamique
    function getChartWidth(container) {
      return Math.min(baseWidth, container.clientWidth - margin.left - margin.right - 40);
    }
    
    // Tooltip partagé
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // Chargement des données
    d3.csv("DataVizCleanedFileV06.csv").then(function(rawData) {
      console.log("Données brutes chargées:", rawData);
      
      // Traitement pour la heatmap
      const engagementLevels = ['low', 'medium', 'high'];
      const satisfactionScores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      // Heatmap data processing
      const heatmapData = [];
      const countMap = {};
      
      engagementLevels.forEach(engagement => {
        satisfactionScores.forEach(satisfaction => {
          countMap[`${engagement}-${satisfaction}`] = 0;
        });
      });
      
      // Variables pour les statistiques
      let totalSatisfaction = 0;
      let satisfactionCount = 0;
      let engagementDistribution = {low: 0, medium: 0, high: 0};
      let satisfactionDistribution = {};
      let totalResearchTime = 0;
      let researchCount = 0;
      
      satisfactionScores.forEach(s => {
        satisfactionDistribution[s] = 0;
      });
      
      rawData.forEach(d => {
        const engagement = d.Engagement_with_Ads.toLowerCase();
        const satisfaction = +d.Customer_Satisfaction;
        
        if (engagementLevels.includes(engagement) && satisfaction >= 1 && satisfaction <= 10) {
          countMap[`${engagement}-${satisfaction}`]++;
          totalSatisfaction += satisfaction;
          satisfactionCount++;
          engagementDistribution[engagement]++;
          satisfactionDistribution[satisfaction]++;
        }
        
        // Traitement temps de recherche
        const time = parseFloat(d.Time_Spent_on_Product_Research);
        if (!isNaN(time)) {
          totalResearchTime += time;
          researchCount++;
        }
      });
      
      // Calcul des moyennes
      const avgSatisfaction = (totalSatisfaction / satisfactionCount).toFixed(1);
      const avgResearchTime = (totalResearchTime / researchCount).toFixed(1);
      
      // Mise à jour des statistiques
      d3.select("#avg-satisfaction").text(avgSatisfaction);
      d3.select("#avg-research").text(avgResearchTime + "h");
      
      // Calcul engagement moyen (numérique pour le calcul)
      const engagementValues = {
        low: 1,
        medium: 2,
        high: 3
      };
      
      let totalEngagement = 0;
      let engagementCount = 0;
      
      rawData.forEach(d => {
        const engagement = d.Engagement_with_Ads.toLowerCase();
        if (engagementLevels.includes(engagement)) {
          totalEngagement += engagementValues[engagement];
          engagementCount++;
        }
      });
      
      const avgEngagementValue = totalEngagement / engagementCount;
      let avgEngagementText = "";
      
      if (avgEngagementValue < 1.5) avgEngagementText = "Faible";
      else if (avgEngagementValue < 2.5) avgEngagementText = "Moyen";
      else avgEngagementText = "Élevé";
      
      // Bar chart data processing
      const socialMediaCounts = {};
      rawData.forEach(d => {
        const influence = d.Social_Media_Influence ? d.Social_Media_Influence.toLowerCase() : 'unknown';
        socialMediaCounts[influence] = (socialMediaCounts[influence] || 0) + 1;
      });
      
      const barData = Object.keys(socialMediaCounts).map(key => ({
        platform: key,
        count: socialMediaCounts[key]
      })).sort((a, b) => b.count - a.count);
      
      // Trouver le réseau social principal
      if (barData.length > 0) {
        d3.select("#top-social").text(barData[0].platform.charAt(0).toUpperCase() + barData[0].platform.slice(1));
      }
      
      engagementLevels.forEach(engagement => {
        satisfactionScores.forEach(satisfaction => {
          heatmapData.push({
            engagement,
            satisfaction,
            count: countMap[`${engagement}-${satisfaction}`]
          });
        });
      });
      
      // Création des visualisations
      createHeatmap(heatmapData);
      createBarchart(barData);
      createEngagementDistribution(engagementDistribution);
      createSatisfactionDistribution(satisfactionDistribution);
      
      // Redimensionnement des graphiques lors du resize de la fenêtre
      window.addEventListener('resize', function() {
        createHeatmap(heatmapData);
        createBarchart(barData);
      });
      
    }).catch(function(error) {
      console.error("Erreur de chargement du fichier CSV:", error);
      alert("Erreur de chargement des données. Voir la console pour plus de détails.");
    });

    function createHeatmap(data) {
      const container = document.getElementById('heatmap');
      container.innerHTML = '';
      
      const chartWidth = getChartWidth(container);
      const chartHeight = baseHeight * (chartWidth / baseWidth);
      
      const svg = d3.select("#heatmap")
        .append("svg")
        .attr("width", chartWidth + margin.left + margin.right)
        .attr("height", chartHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .range([0, chartWidth])
        .domain([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        .padding(0.05);

      const y = d3.scaleBand()
        .range([chartHeight, 0])
        .domain(['low', 'medium', 'high'])
        .padding(0.05);

      const maxCount = d3.max(data, d => d.count);
      const color = d3.scaleSequential()
        .interpolator(d3.interpolateBlues)
        .domain([0, maxCount]);

      svg.selectAll()
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", d => x(d.satisfaction))
        .attr("y", d => y(d.engagement))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => color(d.count))
        .on("mouseover", function(event, d) {
          d3.select(this).style("stroke", "black").style("stroke-width", 2);
          tooltip.html(`<strong>${d.engagement} engagement</strong><br>Satisfaction: ${d.satisfaction}<br>Clients: ${d.count}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("opacity", 1);
        })
        .on("mouseout", function() {
          d3.select(this).style("stroke", "white").style("stroke-width", 1);
          tooltip.style("opacity", 0);
        });

      // Axes avec style amélioré
      svg.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "middle")
        .style("font-size", "12px");

      svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "12px");

      // Labels des axes
      svg.append("text")
        .attr("class", "axis-label")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + margin.bottom - 10)
        .text("Score de Satisfaction Client");

      svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -chartHeight / 2)
        .text("Niveau d'Engagement");
    }

    function createBarchart(data) {
      const container = document.getElementById('barchart');
      container.innerHTML = '';
      
      const chartWidth = getChartWidth(container);
      const chartHeight = baseHeight * (chartWidth / baseWidth);
      
      const svg = d3.select("#barchart")
        .append("svg")
        .attr("width", chartWidth + margin.left + margin.right)
        .attr("height", chartHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .range([0, chartWidth])
        .domain(data.map(d => d.platform))
        .padding(0.2);

      const y = d3.scaleLinear()
        .range([chartHeight, 0])
        .domain([0, d3.max(data, d => d.count)]);

      // Grille
      svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
          .tickSize(-chartWidth)
          .tickFormat("")
        );

      // Axes
      svg.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "12px");

      svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "12px");

      // Labels des axes
      svg.append("text")
        .attr("class", "axis-label")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + margin.bottom - 30)
        .text("Plateformes de réseaux sociaux");

      svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -chartHeight / 2)
        .text("Nombre de mentions");

      // Barres
      svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.platform))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => chartHeight - y(d.count))
        .on("mouseover", function(event, d) {
          d3.select(this).style("fill", "#e74c3c");
          tooltip.html(`<strong>${d.platform}</strong><br>${d.count} mentions`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("opacity", 1);
        })
        .on("mouseout", function() {
          d3.select(this).style("fill", "#3b82f6");
          tooltip.style("opacity", 0);
        });
    }
    
    function createEngagementDistribution(data) {
      const container = document.getElementById('engagement-distribution');
      container.innerHTML = '';
      
      const width = 280;
      const height = 150;
      const radius = Math.min(width, height) / 2 - 10;
      
      // Calcul des totaux et pourcentages
      const total = data.low + data.medium + data.high;
      const percentages = {
        low: ((data.low / total) * 100).toFixed(1),
        medium: ((data.medium / total) * 100).toFixed(1),
        high: ((data.high / total) * 100).toFixed(1)
      };
      
      // Création du SVG
      const svg = d3.select("#engagement-distribution")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
      
      // Groupe principal centré
      const g = svg.append("g")
        .attr("transform", `translate(${width/2},${height/2})`);
      
      // Palette de couleurs améliorée
      const color = d3.scaleOrdinal()
        .domain(["low", "medium", "high"])
        .range(["#ff6b6b", "#4ecdc4", "#45b7d1"]);
      
      // Préparation des données pour le pie chart
      const pie = d3.pie()
        .value(d => data[d])
        .sort(null);
      
      // Création des arcs
      const arc = d3.arc()
        .innerRadius(radius * 0.6) // Donut avec trou central
        .outerRadius(radius);
      
      // Arc pour les étiquettes
      const labelArc = d3.arc()
        .innerRadius(radius * 0.8)
        .outerRadius(radius * 0.8);
      
      // Création des segments
      const arcs = g.selectAll(".arc")
        .data(pie(["low", "medium", "high"]))
        .enter()
        .append("g")
        .attr("class", "arc");
      
      // Dessin des segments
      arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .on("mouseover", function(event, d) {
          d3.select(this).attr("opacity", 0.8);
          tooltip.html(`<strong>${d.data} engagement</strong><br>${data[d.data]} clients (${percentages[d.data]}%)`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("opacity", 1);
        })
        .on("mouseout", function() {
          d3.select(this).attr("opacity", 1);
          tooltip.style("opacity", 0);
        });
      
      // Ajout des pourcentages sur les segments
      arcs.filter(d => (d.endAngle - d.startAngle) > 0.35)
        .append("text")
        .attr("transform", d => {
          const pos = arc.centroid(d);
          pos[0] *= 1.5;
          pos[1] *= 1.5;
          return `translate(${pos})`;
        })
        .attr("dy", "0.35em")
        .attr("class", "pie-label")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("text-anchor", "middle")
        .text(d => `${percentages[d.data]}%`);
      
      // Légende
      const legend = svg.append("g")
        .attr("class", "engagement-legend");
      
      const legendItems = legend.selectAll(".legend-item")
        .data(["low", "medium", "high"])
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0,${i * 20})`);
      
      legendItems.append("rect")
        .attr("class", "legend-color")
        .attr("fill", d => color(d));
      
      legendItems.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .text(d => `${d.charAt(0).toUpperCase() + d.slice(1)}`)
        .style("font-size", "12px");
      
      // Valeur totale au centre
      svg.append("g")
        .attr("class", "total-value")
        .append("text")
        .attr("dy", -5)
        .attr("class", "total-number")
        .text(total);
      
      svg.select(".total-value")
        .append("text")
        .attr("dy", 15)
        .attr("class", "total-label")
        .text("clients");
    }
    
    function createSatisfactionDistribution(data) {
  const container = document.getElementById('satisfaction-distribution');
  container.innerHTML = '';
  
  const width = 280;
  const height = 150;
  const margin = {top: 10, right: 20, bottom: 40, left: 40}; // Augmentez margin.bottom pour l'étiquette
  
  const svg = d3.select("#satisfaction-distribution")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
    
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  const x = d3.scaleBand()
    .domain(Object.keys(data))
    .range([0, width - margin.left - margin.right])
    .padding(0.2);
  
  const y = d3.scaleLinear()
    .domain([0, d3.max(Object.values(data))])
    .range([height - margin.top - margin.bottom, 0]);
  
  // Barres
  g.selectAll(".bar")
    .data(Object.entries(data))
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d[0]))
    .attr("y", d => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", d => height - margin.top - margin.bottom - y(d[1]))
    .attr("fill", "#4e79a7");
  
  // Axe des x
  g.append("g")
    .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "10px");
  
  // Axe des y
  g.append("g")
    .call(d3.axisLeft(y).ticks(4))
    .selectAll("text")
    .style("font-size", "10px");

  // Label axe des x (abscisses)
  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height - 5) // Position ajustée
    .style("text-anchor", "middle")
    .text("Score de satisfaction");

  // Label axe des y (ordonnées)
  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 15)
    .style("text-anchor", "middle")
    .text("Nombre de clients");
}