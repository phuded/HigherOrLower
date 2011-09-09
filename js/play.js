
$.nextTurn = function(higher){
	
	//Add just made bet to total bet
	currentBet += parseInt($("#currentNumFingers").text());

	//Reset slider
	$("#bettingSlider").slider({value:0});
	$("#currentNumFingers").text(0);
	
	//Get new card 
	var nextCard = cards[Math.floor(Math.random()*cards.length)];
	//Display card
	$.displayCard(nextCard, $.compareCards(nextCard,currentCard));
	//Display results, and update scores and set next player
	var correct = $.displayTurnResults(higher,nextCard);
	
	//Finally make the current card the next one
	currentCard=nextCard;
};


//Display the card
$.displayCard = function(card, higher){
	$("#cardDisplay img:visible").hide();
	$("#cardDisplay img#card"+card).show();
	
	$("#cardDisplay img#card"+card).flip({
		direction:higher?'lr':'rl',
		speed: 200
	});
	
	var cardNum = parseInt(card.split("_")[0]);
	
	//Check if can display slider
	if((cardNum>5 & cardNum<11) || $("#fullBetting").attr('checked')){
		$(".infoSlider").show();
	}
	else{
		$(".infoSlider").hide();
	}
	
	//Remove card if remove cards is enabled
	if($("#removeCards").attr('checked')){
		cards.remove(cards.indexOf(card));
		if(cards.length == 0){
			//If no cards left - reset pack
			$.resetPack();
		}
	}
	$("#cardsLeft").html("&nbsp;("+(((cards.length==13 & !$("#wholePack").attr('checked')) || cards.length==52)?"<u>"+cards.length+"</u>":cards.length) + " "+(cards.length>1?"cards":"card") + " left)");
};

//Determine if correct, update picture and text
$.displayTurnResults = function(higher, nextCard){

	var correct = false;
	var oldPlayerName = players[currentPlayer];
	
	//Depending on whether user pressed higher or lower - compare current card to next and display results
	//Determine is correct guess
	if( (higher & $.compareCards(nextCard,currentCard)) || (!higher & $.compareCards(currentCard,nextCard)) ){
		correct=true;
	}
	
	//Update DB
	$.updateDBScores(correct,oldPlayerName);
	
	//Show or hide Lee
	if(correct){
		//Display correct
		$("#infoBar").html("<span class='correctGuess'>Correct!</span>");
		//Hide Lee
		$("#pictureDisplay").hide();
		$("#totalNumFingers").text(currentBet + " fingers");
		//Y position of glass
		var offset = 375-currentBet*30;
		offset = (offset < 0)?0:offset;
		$(".innerGamePanel").animate({backgroundPosition:'0px ' + offset+'px'},900);
	}
	else{
		//Display incorrect
		$("#infoBar").html("<span class='incorrectGuess'><strong>"+oldPlayerName + "</strong>, YOU MUST DRINK<span id='fingers'>" +	(currentBet>0?(currentBet>1?"<BR/>"+currentBet + " fingers":"<BR/>"+currentBet + " finger"):"") +"!</span></span>");
		//Show Lee
		$("#pictureDisplay").show();
		//Animate number of fingers	
		if(currentBet>0){
			$("#infoBar span #fingers").addClass("fingers",400,function () {
				$("#infoBar span span").removeClass("fingers",400);
			});

		}
		
		//Reset bet
		currentBet =0;
		$("#totalNumFingers").text(currentBet + " fingers");
		$(".innerGamePanel").animate({backgroundPosition:'0px 375px'},700);
	}
	
	//Update the score
	$.updateScore(correct, currentPlayer);
	
	//Set the next plater
	$.setNextPlayer();
	
	$("#playerBar").html("<strong>"+players[currentPlayer] + "</strong> guess Higher or Lower!");
	
	return correct;
};


//Determine if correct, update picture and text
$.updateDBScores = function(correct, oldPlayerName){
		
	var winningRun = 0;
	var fingersDrank = correct?0:currentBet;
	
	if(correct){
		//Add 1 for turn just won
		winningRun = 1;
		//Determine any winning streak
		for(var i = playersScores[currentPlayer].length; i--; i>=0){
			var prevTurn = playersScores[currentPlayer][i];
			if(prevTurn){
				winningRun++;
			}
			else{
				break;
			}
		}
		
		//Alert user
		if(winningRun%5 == 0){
			$.sticky('<b>'+oldPlayerName+'</b><p>You are on a streak of <b>' + winningRun + '</b> correct guesses!</p>');
		}
	}
	
	//Update DB
	$.ajax({
		type: "POST",
		url: "editPlayer",
		data: "name="+oldPlayerName+"&maxFingers="+fingersDrank+"&maxCorrect="+winningRun,
		dataType: "json",
		success: function(json){
			if(json.result == 'Player Added'){
				$.sticky('<b>'+oldPlayerName+'</b><p>You have been added to the player list!</p>');
			}
			else if (json.result == 'Updated Max Fingers'){
				$.sticky('<b>'+oldPlayerName+'</b><p>You have beaten your max drinking score after consuming <b>' + fingersDrank + ' fingers</b>!</p>');
			}
			else if (json.result == 'Updated Max Correct'){
				$.sticky('<b>'+oldPlayerName+'</b><p>Well done! Your longest streak of correct guesses is now <b>'+winningRun+'</b>.</p>');
			}
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			// Error!
		}
	});
	
};


//Update the score for a player
$.updateScore = function(correct, oldPlayer){
	//Add score to array and score tab
	playersScores[oldPlayer].push(correct);
	
	//Get the row object for the old player
	var playerScoreRow = $("#scoreTab table tr:eq("+oldPlayer+")");

	$.addScoreCol(playerScoreRow,correct,oldPlayer);
};

//Add a new column to the score tab
$.addScoreCol = function(playerScoreRow,correct, playerId){
	//If table is full - delete first row before adding latest
	
	var numCols = $("#main").css("width");
	numCols = numCols.substring(0,numCols.length-2);
	numCols = Math.round(numCols/53);
	
	if(playerScoreRow.children("td").size() == numCols){
		playerScoreRow.find("td:eq(0)").remove();
	}
	if(correct){
		playerScoreRow.append("<td class='correct'>" + playersScores[playerId].length)
	}
	else{
		playerScoreRow.append("<td class='incorrect'>" + playersScores[playerId].length)
	}
};


$.generateDrinkersTab = function(id,orderBy,dir){
	//Clear table
	var table = $("#drinkersTab table");
	table.find("tr:gt(0)").remove();
	$.showLoading(true);
	
	//Get state
	
	var sDir = table.data("sort");
	
	//If a column has ever been stored
	if(sDir){
		//if same column
		if(sDir.col==id){
			table.data("sort",sDir.dir=="asc"?{col:id,dir:"desc"}:{col:id,dir:"asc"});
		}
		//else set
		else{
			table.data("sort",{col:id,dir:dir});
		}
	}
	//else set
	else{
		table.data("sort",{col:id,dir:dir});
	}
	
	//Set var as actual direction
	sDir = table.data("sort").dir;
	//Remove classes from other columns
	table.find("tr th").removeClass("asc desc");
	//Add class to current columns
	table.find("tr th:eq("+id+")").addClass(sDir);

	$.ajax({
			type: "POST",
			url: "listScores",
			dataType:"json",
			data:"orderBy="+orderBy+"&dir="+sDir+"&num=12&start=0",
			success: function(json){
				//Remove again
				table.find("tr:gt(0)").remove();
				//Populate
				$.each(json[1], function(index,value){
					var lastPlayed = value.lastPlayed;
					if(!lastPlayed){
						lastPlayed = "";
					}
					else{
						lastPlayed = lastPlayed.substring(8,10) + "/" + lastPlayed.substring(5,7) + "/"+ lastPlayed.substring(0,4);
					}
					table.append("<tr><td>"+(index+1)+"</td><td>" + value.name + "</td><td>" + value.maxFingers + "</td><td>" + value.maxCorrect + "</td><td>" + lastPlayed + "</td></tr>");
				});
				$.showLoading(false);
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				table.find("tr:gt(0)").remove();
				$.showLoading(false);
			}
	});
};


//Get the next player from the array
$.setNextPlayer = function(){
	if((currentPlayer+1) == players.length){
		currentPlayer = 0;
	}
	else{
		currentPlayer++;
	}
};

//Show/hide form
$.showForm = function(show, startGame){
	if(show){
		$("#gameTable").fadeOut(function () {
			$("#newGamePanel").show();
		});
	}
	else{
		if(startGame){
			$("#cardDisplay img").hide();
		}
		$("#newGamePanel").fadeOut(function () {
			$("#gameTable").show();
			if(startGame){
				$.startGame();
			}
		});
	}
};

// Reset form
$.resetForm = function(){
	$("#newGameForm").find("div:gt(0)").remove();
	$("#newGameForm div:(0) select").html("");
	$("#player_1 input").val("");
	//Reset betting options
	//$("#fullBetting,#removeCards,#wholePack").attr('checked',false);
}

//Show loading on drinkers tab
$.showLoading = function(show){
	if(show){
		$(".spinner").show();
	}
	else{
		$(".spinner").hide();
	}
};

//Show loading on drinkers tab
$.resetPack = function(){
	if($("#wholePack").attr('checked')){
		cards = new Array();
		for(var i =2;i<15;i++){
			cards.push(i+"_hearts");
			cards.push(i+"_diamonds");
			cards.push(i+"_clubs");
			cards.push(i+"_spades");
		}
	}
	else{
		cards = new Array();
		for(var i =2;i<15;i++){
			cards.push(i+"_hearts");

		}
	}
};

$.compareCards = function(next,current){
	//Returns true if card 1 >= card 2
	return (parseInt(next.split("_")[0]) >= parseInt(current.split("_")[0]));
};

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};