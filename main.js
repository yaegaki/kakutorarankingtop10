var data = [];
var url = "./ranking.json?" + Math.random();
$.get(url, function (d) {
	if (d instanceof Array) {
		data = d;
	}
	else {
		data = JSON.parse(d);
	}
	var dd = $("#select-date-dropdown");
	for (var i = 0; i < data.length; i++) {
		var li = $("<li><a href='#'>" + dateToString(new Date(data[i].date)) + "</li>");
		li.on("click", (function (_i) {
			return function (e) {
				select(_i);
				e.preventDefault();
			}
		})(i));
		dd.append(li);
	}
	select(0);
	createLineChart();
});

function dateToString(date) {
	var h = date.getHours().toString();
	if (h.length == 1) {
		h = "0" + h;
	}
	var m = date.getMinutes().toString();
	if (m.length == 1) {
		m = "0" + m;
	}
	return (date.getMonth() + 1) + "/" + date.getDate() + " " + h + ":" + m;
}

function createTd(value) {
	var td = document.createElement("td");
	td.innerHTML = value;
	return td;
}

function select(dataId) {
	if (data.length <= dataId) {
		return;
	}


	var tb = document.getElementById("ranking-table");
	$(tb).empty();
	var current = data[dataId];
	var currentDate = new Date(current.date);
	$("#select-date-str").html(dateToString(currentDate));
	var prevExists = data.length > dataId + 1;
	var prevMap = {};
	if (prevExists) {
		var prev = data[dataId + 1];
		var prevDate = new Date(prev.date);
		var diffMinute = (currentDate - prevDate) / (60 * 1000);
		for (var i = 0; i < prev.top10.length; i++) {
			var entry = prev.top10[i];
			prevMap[entry.name] = {
				rank: i + 1,
				point: entry.point
			};
		}
	}
	for (var i = 0; i < current.top10.length; i++) {
		var tr = document.createElement("tr");
		var entry = current.top10[i];
		var rank = i + 1;
		// 順位
		tr.appendChild(createTd(rank));
		// ポイント
		tr.appendChild(createTd(entry.point));
		var name = entry.name;


		// 上の順位との差
		if (i == 0) {
			tr.appendChild(createTd("-"));
		}
		else {
			tr.appendChild(createTd(entry.point - current.top10[i-1].point));
		}

		// 名前
		tr.appendChild(createTd(name));

		var prevData = prevMap[name];
		if (prevData == null) {
			// 前回の順位
			tr.appendChild(createTd("-"));
			// 上昇量
			tr.appendChild(createTd("-"));
		}
		else {
			var rankDiff = prevData.rank - rank;
			var rankArrow;
			var rankClass;
			if (rankDiff < 0) {
				rankArrow = Math.abs(rankDiff) + "↓";
				rankClass = "rank-down";
			}
			else if (rankDiff > 0) {
				rankArrow = Math.abs(rankDiff) + "↑";
				rankClass = "rank-up";
			}
			else {
				rankArrow = "→";
				rankClass = "rank-normal";
			}

			// 前回の順位
			var prevRankTd = createTd(prevData.rank);
			tr.appendChild(prevRankTd);
			var span = document.createElement("span");
			span.innerHTML = "(" + rankArrow + ")";
			span.setAttribute("class", rankClass);
			prevRankTd.appendChild(span);
			// 上昇量
			tr.appendChild(createTd(Math.floor((entry.point - prevData.point) / diffMinute * 30)));
		}


		tb.appendChild(tr);
	}
}

function createLineChart() {
	var minPoint = 0;
	var maxPoint = 0;

	// 人ごとに分類する
	var playerMap = {};
	var latest = true;
	data.forEach(function (d) {
		var date = new Date(d.date);
		var rank = 1;
		d.top10.forEach(function (e) {
			if (latest) {
				var player = playerMap[e.name] = {rank:rank, data:[]};
				rank++;
			}
			else {
				var player = playerMap[e.name];
				if (player == null) {
					return;
				}
			}

			// ついでに最小値、最大値もとっておく
			if (e.point > maxPoint) {
				maxPoint = e.point;
			}
			else if (e.point < minPoint) {
				minPoint = e.point;
			}

			player.data.push({
				date: date,
				point: e.point,
			});
		});
		latest = false;
	});


	// set the dimensions and margins of the graph
	var margin = {top: 20, right: 20, bottom: 30, left: 50},
		width = 960 - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;

	// set the ranges
	var x = d3.scaleTime().range([0, width]);
	var y = d3.scaleLinear().range([height, 0]);

	// define the line
	var valueline = d3.line()
		.x(function(d) { return x(d.date); })
		.y(function(d) { return y(d.point); });

	var svg = d3.select("#graph")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform",
			"translate(" + margin.left + "," + margin.top + ")");

	x.domain([new Date(data[data.length-1].date), new Date(data[0].date)]);
	y.domain([minPoint, maxPoint]);

	for (var playerName in playerMap) {
		var player = playerMap[playerName];
		svg.append("path")
			.data([player.data])
			.attr("class", "line rank-" + player.rank)
			.attr("d", valueline);


		// Add the scatterplot
		svg.selectAll("dot")
			.data(player.data)
			.enter().append("circle")
			.attr("class", "dot rank-" + player.rank)
			.attr("r", 3.5)
			.attr("cx", function(d) { return x(d.date); })
			.attr("cy", function(d) { return y(d.point); });
	}

	// Add the X Axis
	svg.append("g")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(x));

	// Add the Y Axis
	svg.append("g")
		.call(d3.axisLeft(y));
}

