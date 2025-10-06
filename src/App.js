import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import "./App.css";

function App() {
  const [coins, setCoins] = useState([]);
  const svgRef = useRef();

  // -------- Fetch Data --------
  useEffect(() => {
    const fetchData = () => {
      fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=60&page=1&sparkline=false"
      )
        .then((res) => res.json())
        .then((data) => setCoins(data))
        .catch((err) => console.error(err));
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // -------- Visualization --------
  useEffect(() => {
    if (!coins.length) return;

    const width = 1300;
    const height = 800;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // ✨ Glow Gradient + Gold Shine
    svg.append("defs").html(`
      <radialGradient id="goldGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff7d1"/>
        <stop offset="40%" stop-color="#FFD700"/>
        <stop offset="100%" stop-color="#8B7500"/>
      </radialGradient>

      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `);

    // Particle background ✨
    const makeSparkle = () => {
      d3.range(80).forEach(() => {
        svg
          .append("circle")
          .attr("cx", Math.random() * width)
          .attr("cy", Math.random() * height)
          .attr("r", Math.random() * 1.5)
          .style("fill", "#fff8b0")
          .style("opacity", Math.random() * 0.5)
          .transition()
          .duration(4000 + Math.random() * 2000)
          .attr("opacity", 0)
          .remove();
      });
    };
    makeSparkle();
    setInterval(makeSparkle, 3000);

    // --- Scales ---
    const maxCap = d3.max(coins, (d) => d.market_cap || 0);
    const rScale = d3.scaleSqrt().domain([0, maxCap]).range([30, 120]);
    const color = (change) => {
      if (change === null || change === undefined) return "#555";
      const t = Math.max(-20, Math.min(20, change)) / 40 + 0.5;
      return d3.interpolateRgbBasis(["#ff0033", "#FFD700", "#00ff88"])(t);
    };

    const nodes = coins.map((d) => ({
      ...d,
      r: rScale(d.market_cap),
      x: Math.random() * width,
      y: Math.random() * height,
      driftPhase: Math.random() * Math.PI * 2,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(12))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d) => d.r + 3))
      .on("tick", ticked);

    const node = svg
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", (e, d) =>
        window.open(`https://www.coingecko.com/en/coins/${d.id}`, "_blank")
      )
      .on("mouseover", function (e, d) {
        d3.select(this)
          .select("circle")
          .transition()
          .duration(200)
          .attr("transform", "scale(1.15)")
          .style(
            "filter",
            "drop-shadow(0 0 20px #FFD700) drop-shadow(0 0 60px #fffa9e)"
          );
      })
      .on("mouseout", function () {
        d3.select(this)
          .select("circle")
          .transition()
          .duration(400)
          .attr("transform", "scale(1)")
          .style("filter", "url(#glow)");
      });

    // 💰 Golden Coin
    node
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", "url(#goldGradient)")
      .attr("stroke", "#FFD700")
      .attr("stroke-width", 4)
      .attr("class", "gold-coin");

    // 🪙 Logo
    node
      .append("image")
      .attr("xlink:href", (d) => d.image)
      .attr("x", (d) => -d.r * 0.45)
      .attr("y", (d) => -d.r * 0.45)
      .attr("width", (d) => d.r * 0.9)
      .attr("height", (d) => d.r * 0.9)
      .attr("clip-path", "circle()");

    // 🧾 Info text (inside coin)
    const textBlock = node
      .append("text")
      .attr("text-anchor", "middle")
      .style("font-family", "Inter, sans-serif")
      .style("fill", "#fff")
      .style("font-weight", "600")
      .style("text-shadow", "0 0 3px #000, 0 0 8px #000")
      .style("pointer-events", "none");

    textBlock
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "-0.5em")
      .style("font-size", (d) => Math.max(10, d.r / 4) + "px")
      .text((d) => d.symbol.toUpperCase());

    textBlock
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .style("font-size", (d) => Math.max(9, d.r / 4.5) + "px")
      .text((d) => `$${d3.format(",.0f")(d.current_price)}`);

    textBlock
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .style("fill", (d) =>
        d.price_change_percentage_24h >= 0 ? "#00FF88" : "#FF3333"
      )
      .style("font-size", (d) => Math.max(8, d.r / 5) + "px")
      .text((d) => `${d.price_change_percentage_24h?.toFixed(1)}%`);

    textBlock
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .style("font-size", (d) => Math.max(8, d.r / 6) + "px")
      .style("fill", "#f9e88b")
      .text((d) => `MC: ${d3.format(".2s")(d.market_cap).replace("G", "B")}`);

    // 🌊 Floating Drift Animation
    const floatSpeed = 0.015;
    d3.timer((elapsed) => {
      nodes.forEach((d) => {
        d.y += Math.sin(elapsed * floatSpeed + d.driftPhase) * 0.15;
        d.x += Math.cos(elapsed * floatSpeed * 0.7 + d.driftPhase) * 0.15;
      });
      simulation.alpha(0.07).restart();
    });

    function ticked() {
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    }
    function dragstarted(e) {
      if (!e.active) simulation.alphaTarget(0.3).restart();
      e.subject.fx = e.subject.x;
      e.subject.fy = e.subject.y;
    }
    function dragged(e) {
      e.subject.fx = e.x;
      e.subject.fy = e.y;
    }
    function dragended(e) {
      if (!e.active) simulation.alphaTarget(0);
      e.subject.fx = null;
      e.subject.fy = null;
    }

    return () => simulation.stop();
  }, [coins]);

  return (
    <div
      style={{
        background: "radial-gradient(circle at 50% 50%, #0a0a0a, #000)",
        minHeight: "100vh",
        color: "#fff",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <h1
        style={{
          padding: "10px",
          fontWeight: 700,
          letterSpacing: "2px",
        }}
      >
        🪙 Crypto Dashboard - Top 50 Real-Time Visualizer by Kri 🪙
      </h1>
      <svg ref={svgRef} width="1300" height="800"></svg>
    </div>
  );
}

export default App;

   