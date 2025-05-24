 // Variables globales
    let rawData = [];
    let currentFilters = {
      payment: 'all',
      discount: 'all'
    };
    
    // Références aux éléments de statistiques
    const totalAmountEl = document.getElementById('total-amount');
    const totalTransactionsEl = document.getElementById('total-transactions');
    const avgBasketEl = document.getElementById('avg-basket');
    const discountUsageEl = document.getElementById('discount-usage');
    const totalChangeEl = document.getElementById('total-change');
    const transactionsChangeEl = document.getElementById('transactions-change');
    const basketChangeEl = document.getElementById('basket-change');
    const discountChangeEl = document.getElementById('discount-change');

    // Palette de couleurs étendue pour toutes les catégories
    const financialColors = [
      "#2ecc71", "#3498db", "#9b59b6", "#f1c40f", "#e74c3c", 
      "#1abc9c", "#34495e", "#e67e22", "#16a085", "#27ae60",
      "#2980b9", "#8e44ad", "#f39c12", "#d35400", "#c0392b",
      "#7f8c8d", "#2c3e50", "#1a5276", "#7d3c98", "#27ae60",
      "#f39c12", "#e74c3c", "#16a085", "#d35400", "#8e44ad"
    ];

    // Chargement des données depuis le fichier CSV
    d3.csv("DataVizCleanedFileV06.csv").then(function(data) {
      rawData = data;
      
      // Traitement initial des données
      processData(rawData);
      
      // Gestion des événements de filtre
      d3.selectAll(".filter-option").on("click", function() {
        const filterValue = this.getAttribute("data-filter");
        const filterType = this.getAttribute("data-type");
        
        // Mettre à jour l'état actif
        d3.selectAll(`.filter-option[data-type="${filterType}"]`)
          .classed("active", false);
        d3.select(this).classed("active", true);
        
        // Mettre à jour les filtres
        currentFilters[filterType] = filterValue;
        
        // Filtrer et mettre à jour les visualisations
        const filteredData = filterData(rawData);
        updateVisualizations(filteredData);
        updateStats(filteredData);
      });
    }).catch(function(error) {
      console.error("Erreur lors du chargement du fichier CSV :", error);
      // En cas d'erreur, afficher un message
      alert("Erreur lors du chargement des données. Vérifiez que le fichier DataVizCleanedFileV06.csv est accessible.");
    });

    // Fonction pour traiter les données
    function processData(data) {
      // Conversion des types de données
      data.forEach(d => {
        d.Purchase_Amount = +d.Purchase_Amount;
        d.Discount_Used = String(d.Discount_Used);
        
        // Nettoyage des catégories (au cas où)
        if (d.Purchase_Category) {
          d.Purchase_Category = d.Purchase_Category.trim();
        }
      });
      
      // Initialiser les visualisations
      const filteredData = filterData(data);
      createTreemap(filteredData);
      createHistogram(filteredData);
      updateStats(filteredData);
    }

    // Fonction pour filtrer les données
    function filterData(data) {
      return data.filter(d => {
        const paymentMatch = currentFilters.payment === 'all' || d.Payment_Method === currentFilters.payment;
        const discountMatch = currentFilters.discount === 'all' || d.Discount_Used === currentFilters.discount;
        return paymentMatch && discountMatch;
      });
    }

    // Fonction pour mettre à jour les visualisations
    function updateVisualizations(filteredData) {
      updateTreemap(filteredData);
      updateHistogram(filteredData);
    }
    
    // Fonction pour mettre à jour les statistiques
    function updateStats(filteredData) {
      if (filteredData.length === 0) {
        totalAmountEl.textContent = "0 €";
        totalTransactionsEl.textContent = "0";
        avgBasketEl.textContent = "0 €";
        discountUsageEl.textContent = "0%";
        return;
      }
      
      // Calcul des statistiques
      const totalAmount = d3.sum(filteredData, d => d.Purchase_Amount);
      const totalTransactions = filteredData.length;
      const avgBasket = totalAmount / totalTransactions;
      const discountUsage = (filteredData.filter(d => d.Discount_Used === 'True').length / totalTransactions * 100);
      
      // Calcul des moyennes globales pour les comparaisons
      const globalTotalAmount = d3.sum(rawData, d => d.Purchase_Amount);
      const globalTotalTransactions = rawData.length;
      const globalAvgBasket = globalTotalAmount / globalTotalTransactions;
      const globalDiscountUsage = (rawData.filter(d => d.Discount_Used === 'True').length / globalTotalTransactions) * 100;
      
      // Mise à jour des éléments
      totalAmountEl.textContent = d3.format(",.2f")(totalAmount) + ' €';
      totalTransactionsEl.textContent = totalTransactions.toLocaleString();
      avgBasketEl.textContent = d3.format(",.2f")(avgBasket) + ' €';
      discountUsageEl.textContent = d3.format(".1f")(discountUsage) + '%';
      
      // Calcul et mise à jour des variations
      const totalChange = ((totalAmount / (globalTotalAmount / globalTotalTransactions * totalTransactions)) - 1) * 100;
      const transactionsChange = ((totalTransactions / globalTotalTransactions) - 1) * 100;
      const basketChange = ((avgBasket / globalAvgBasket) - 1) * 100;
      const discountChangeValue = ((discountUsage / globalDiscountUsage) - 1) * 100;
      
      totalChangeEl.textContent = `${totalChange >= 0 ? '+' : ''}${d3.format(".1f")(totalChange)}% vs moyenne`;
      transactionsChangeEl.textContent = `${transactionsChange >= 0 ? '+' : ''}${d3.format(".1f")(transactionsChange)}% vs moyenne`;
      basketChangeEl.textContent = `${basketChange >= 0 ? '+' : ''}${d3.format(".1f")(basketChange)}% vs moyenne`;
      discountChangeEl.textContent = `${discountChangeValue >= 0 ? '+' : ''}${d3.format(".1f")(discountChangeValue)}% vs moyenne`;
      
      // Mise à jour des couleurs
      totalChangeEl.className = `stat-change ${totalChange >= 0 ? 'positive' : 'negative'}`;
      transactionsChangeEl.className = `stat-change ${transactionsChange >= 0 ? 'positive' : 'negative'}`;
      basketChangeEl.className = `stat-change ${basketChange >= 0 ? 'positive' : 'negative'}`;
      discountChangeEl.className = `stat-change ${discountChangeValue >= 0 ? 'positive' : 'negative'}`;
    }

    // Fonctions pour le treemap
    function createTreemap(data) {
      // Regroupement des données par catégorie
      const groupedData = d3.group(data, d => d.Purchase_Category);

      // Création de la structure hiérarchique
      const hierarchyData = {
        name: "Purchases",
        children: Array.from(groupedData, ([key, values]) => ({
          name: key,
          value: d3.sum(values, d => d.Purchase_Amount)
        }))
      };

      // Tri par valeur décroissante
      const rootHierarchy = d3.hierarchy(hierarchyData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

      const width = document.querySelector('#treemap').clientWidth;
      const height = 400;

      // Calcul du treemap
      d3.treemap()
        .size([width, height])
        .padding(2)
        (rootHierarchy);

      const svg = d3.select("#treemap");
      svg.selectAll("*").remove();

      const color = d3.scaleOrdinal(financialColors);

      const tooltip = d3.select("#tooltip");

      // Création des noeuds
      const node = svg
        .selectAll("g")
        .data(rootHierarchy.leaves())
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

      // Ajout des rectangles
      node.append("rect")
        .attr("id", d => d.data.name)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(d.data.name))
        .on("mouseover", function(event, d) {
          tooltip.transition()
            .style("opacity", 1);
          tooltip.html(`Catégorie: ${d.data.name}<br>Montant: ${d3.format(",.2f")(d.data.value)} €`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
          tooltip.transition()
            .style("opacity", 0);
        });

      // Ajout du texte dans les rectangles
      node.append("text")
        .attr("x", 5)
        .attr("y", 5)
        .selectAll("tspan")
        .data(d => wrapText(d.data.name, d.x1 - d.x0))
        .enter()
        .append("tspan")
        .attr("x", 5)
        .attr("dy", (d, i) => i === 0 ? "1.2em" : "1.2em")
        .style("font-size", "8px")
        .text(d => d);
    }

    function updateTreemap(data) {
      const groupedData = d3.group(data, d => d.Purchase_Category);

      const hierarchyData = {
        name: "Purchases",
        children: Array.from(groupedData, ([key, values]) => ({
          name: key,
          value: d3.sum(values, d => d.Purchase_Amount)
        }))
      };

      const rootHierarchy = d3.hierarchy(hierarchyData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

      const width = document.querySelector('#treemap').clientWidth;
      const height = 400;

      d3.treemap()
        .size([width, height])
        .padding(2)
        (rootHierarchy);

      const svg = d3.select("#treemap");
      svg.selectAll("*").remove();

      const color = d3.scaleOrdinal(financialColors);

      const node = svg
        .selectAll("g")
        .data(rootHierarchy.leaves())
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

      node.append("rect")
        .attr("id", d => d.data.name)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(d.data.name));

      node.append("text")
        .attr("x", 5)
        .attr("y", 5)
        .selectAll("tspan")
        .data(d => wrapText(d.data.name, d.x1 - d.x0))
        .enter()
        .append("tspan")
        .attr("x", 5)
        .attr("dy", (d, i) => i === 0 ? "1.2em" : "1.2em")
        .style("font-size", "8px")
        .text(d => d);
    }

    // Fonctions pour l'histogramme
    function createHistogram(data) {
      const margin = {top: 60, right: 100, bottom: 80, left: 60};
      const width = document.querySelector('#histogram').clientWidth - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const svg = d3.select("#histogram")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().range([0, width]);
      const y = d3.scaleLinear().range([height, 0]);

      const validData = data.filter(d => !isNaN(d.Purchase_Amount));

      if (validData.length === 0) {
        console.error("Aucune donnée valide trouvée.");
        return;
      }

      x.domain(d3.extent(validData, d => d.Purchase_Amount)).nice();

      const histogram = d3.histogram()
          .value(d => d.Purchase_Amount)
          .domain(x.domain())
          .thresholds(x.ticks(30));

      const bins = histogram(validData);

      y.domain([0, d3.max(bins, d => d.length)]).nice();

      const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(bins, d => d.length)]);

      const histTooltip = d3.select("#histogram-tooltip");
      
      svg.selectAll(".bar")
          .data(bins)
          .enter().append("rect")
              .attr("class", "bar")
              .attr("x", d => x(d.x0) + 1)
              .attr("y", d => y(d.length))
              .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
              .attr("height", d => height - y(d.length))
              .attr("fill", d => colorScale(d.length))
              .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "#e74c3c");
                
                histTooltip.transition()
                  .duration(200)
                  .style("opacity", .9);
                histTooltip.html(`Montant: ${d3.format(",.2f")(d.x0)} à ${d3.format(",.2f")(d.x1)} €<br>Transactions: ${d.length}`)
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 28) + "px");
              })
              .on("mouseout", function(event, d) {
                d3.select(this).attr("fill", d => colorScale(d.length));
                
                histTooltip.transition()
                  .duration(500)
                  .style("opacity", 0);
              });

      // Axe des X
      svg.append("g")
          .attr("class", "axis axis--x")
          .attr("transform", `translate(0,${height})`)
          .call(d3.axisBottom(x).tickFormat(d3.format(",.0f")))
          .append("text")
            .attr("x", width)
            .attr("y", -6)
            .style("text-anchor", "end")
            .text("Montant (€)");

      // Titre axe des X
      svg.append("text")
          .attr("x", width / 2)
          .attr("y", height + 50)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .text("Montant d'achat (Purchase_Amount)");

      // Axe des Y
      svg.append("g")
          .attr("class", "axis axis--y")
          .call(d3.axisLeft(y).ticks(10))
          .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .style("text-anchor", "end")
            .text("Fréquence");

      // Titre axe des Y
      svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -height / 2)
          .attr("y", -50)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .text("Nombre de transactions");
          
      // Légende
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width +32}, 20)`)
        .style("pointer-events", "none");

      const legendData = [
        {label: "Faible", color: colorScale(0)},
        {label: "Moyen", color: colorScale(d3.max(bins, d => d.length)/2)},
        {label: "Élevé", color: colorScale(d3.max(bins, d => d.length))}
      ];

      legend.selectAll("rect")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => d.color);

      legend.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 20 + 12)
        .style("font-size", "9px")
        .text(d => d.label);
    }

    function updateHistogram(data) {
      const margin = {top: 60, right: 100, bottom: 80, left: 60};
      const width = document.querySelector('#histogram').clientWidth - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const svg = d3.select("#histogram");
      svg.selectAll("*").remove();
      
      const g = svg
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().range([0, width]);
      const y = d3.scaleLinear().range([height, 0]);

      const validData = data.filter(d => !isNaN(d.Purchase_Amount));

      if (validData.length === 0) {
        console.error("Aucune donnée valide trouvée.");
        return;
      }

      x.domain(d3.extent(validData, d => d.Purchase_Amount)).nice();

      const histogram = d3.histogram()
          .value(d => d.Purchase_Amount)
          .domain(x.domain())
          .thresholds(x.ticks(30));

      const bins = histogram(validData);

      y.domain([0, d3.max(bins, d => d.length)]).nice();

      const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(bins, d => d.length)]);

      const histTooltip = d3.select("#histogram-tooltip");
      
      g.selectAll(".bar")
          .data(bins)
          .enter().append("rect")
              .attr("class", "bar")
              .attr("x", d => x(d.x0) + 1)
              .attr("y", d => y(d.length))
              .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
              .attr("height", d => height - y(d.length))
              .attr("fill", d => colorScale(d.length))
              .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "#e74c3c");
                
                histTooltip.transition()
                  .duration(200)
                  .style("opacity", .9);
                histTooltip.html(`Montant: ${d3.format(",.2f")(d.x0)} à ${d3.format(",.2f")(d.x1)} €<br>Transactions: ${d.length}`)
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 28) + "px");
              })
              .on("mouseout", function(event, d) {
                d3.select(this).attr("fill", d => colorScale(d.length));
                
                histTooltip.transition()
                  .duration(500)
                  .style("opacity", 0);
              });

      // Axe des X
      g.append("g")
          .attr("class", "axis axis--x")
          .attr("transform", `translate(0,${height})`)
          .call(d3.axisBottom(x).tickFormat(d3.format(",.0f")));

      // Titre axe des X
      g.append("text")
          .attr("x", width / 2)
          .attr("y", height + 50)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .text("Montant d'achat (Purchase_Amount)");

      // Axe des Y
      g.append("g")
          .attr("class", "axis axis--y")
          .call(d3.axisLeft(y).ticks(10));

      // Titre axe des Y
      g.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -height / 2)
          .attr("y", -50)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .text("Nombre de transactions");
          
      // Légende
      const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width +32}, 20)`)
        .style("pointer-events", "none");

      const legendData = [
        {label: "Faible", color: colorScale(0)},
        {label: "Moyen", color: colorScale(d3.max(bins, d => d.length)/2)},
        {label: "Élevé", color: colorScale(d3.max(bins, d => d.length))}
      ];

      legend.selectAll("rect")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => d.color);

      legend.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 20 + 12)
        .style("font-size", "9px")
        .text(d => d.label);
    }

    // Fonction utilitaire pour le texte dans le treemap
    function wrapText(text, width) {
      const words = text.split(" ");
      const lines = [];
      let currentLine = "";
      const maxWidth = width - 10;

      words.forEach(word => {
        const testLine = currentLine + word + " ";
        const testWidth = measureTextWidth(testLine);
        if (testWidth > maxWidth) {
          lines.push(currentLine.trim());
          currentLine = word + " ";
        } else {
          currentLine = testLine;
        }
      });

      lines.push(currentLine.trim());
      return lines;
    }

    function measureTextWidth(text) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      context.font = "10px sans-serif";
      return context.measureText(text).width;
    }