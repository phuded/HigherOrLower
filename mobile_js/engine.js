
$.prepareGame = function(){
	
	//Get player list
	$.getPlayerList();
	
	$('#drink').live('pageshow',function(event){
		var fingers = $("#numFingers");
		fingers.animate({fontSize:'3.0em'}, 400);
		fingers.animate({fontSize:'1.0em'}, 300);
		
	});
	
	//When the drinkers tab is selected
	$('#drinkers').live('pageshow',function(event){
		$("#drinkersTab table").removeData("sort");
		$.generateDrinkersTab(2,"max_finger","desc");
	});
	
	//When the scores tab is unselected - reset deep dive
	$('#game,#drinkers').live('pageshow',function(event){
		$.showPlayerStats(0,false);
	});
	
	//Show loading on drinkers tab close
	$('#game, #scores').live('pageshow',function(event){
		$.showLoading(true);
	});	
};


$.startGame = function(){
	
	var canPlay = true;
		
	//Check to ensure all player names are entered
	$("#playerRows div").each(function(){
		var playerName = $($(this).children("input")[0]).val();

		if(playerName == ""){
			canPlay = false;
		}
	});
		
	if(canPlay){
		//Reset player
		currentPlayer = 0;
		
		//Reset bet
		currentBet=0;
		//Set drink type
		$("input.drinkOption").each(function(){
			if($(this).attr("checked")){
				drinkType = $(this).val()
			}
		});
		//Reset bet counter
		$("#totalNumFingers").text(currentBet + " " + drinkType + "s");
		
		players = new Array();
		playersScores = new Array();
		//Restore all cards based on toggle
		$.resetPack();

		//Reset scoretab
		$(".scoreTable").html("");
		
		//Create scoretab var
		var scoreTable = "";
		
		//Set players in array
		$("#playerRows tr").each(function(){
			var playerName = $(this).find("input").val();
			players.push(playerName);
			playersScores.push(new Array());
			//Add in header row
			scoreTable += "<tr><th><a href='javascript:$.showPlayerStats("+(players.length-1)+",true)' data-role='button' data-icon='grid' data-theme='"+((players.length%2 == 0)?"c":"b")+"'>"+playerName+"</a></th></tr>";
		});
	
		//Append table to div
		$(".scoreTable").append(scoreTable).trigger("create");
	
		//Display Player
		$("#playerName").html("<strong>"+players[currentPlayer] + "</strong> guess Higher or Lower!");
		
		//New card
		currentCard = cards[Math.floor(Math.random()*cards.length)];
		
		//Hide any current card
		$("#cardDisplay").css("background-color","");
		$("#cardDisplay img").hide();
		
		//Close Dialogue
		$.closeForm();
		//Display card
		$.displayCard(currentCard,"");

		//Reset bet slider
		$("#currentNumFingers").val(0).slider("refresh");
	}
};

$.nextTurn = function(higherGuess){
	if(players.length>0){
		//Remove colour from background
		$("#cardDisplay").css("background-color","");
		//Add just made bet to total bet
		currentBet += parseInt($("#currentNumFingers").val());

		//Reset bet counter
		$("#currentNumFingers").val(0).slider("refresh");
		
		//Get new card 
		var nextCard = cards[Math.floor(Math.random()*cards.length)];
		var correctGuess = (higherGuess & $.compareCards(nextCard,currentCard)) || (!higherGuess & $.compareCards(currentCard,nextCard)); 
		
		//Display card
		$.displayCard(nextCard,$.compareCards(nextCard,currentCard),correctGuess);
		//Display results, and update scores and set next player
		$.displayTurnResults(nextCard,correctGuess);
		
		//Finally make the current card the next one
		currentCard=nextCard;
	}
};

//Display the card
$.displayCard = function(card,nextCardHigher,correctGuess){
	$("#cardDisplay img:visible").hide();
	$("#cardDisplay img#"+card).show();
	
	if(nextCardHigher!==""){
		$("#cardDisplay img#"+card).flip({
			direction:nextCardHigher?'lr':'rl',
			speed: 250,
			color:"white",
			onEnd: function(){
				if(correctGuess){
					//Green background
					$("#cardDisplay").css("background-color","green");
				}
				else{
					//Red background
					$("#cardDisplay").css("background-color","red");
				}
			}
		});
	}
		
	var cardNum = parseInt(card.substring(1));
	
	//Check if can display betting buttons
	if((cardNum>5 & cardNum<11) || $("#fullBetting").attr('checked')){
		$("#sliderBar").show();
	}
	else{
		$("#sliderBar").hide();
	}
	
	//Remove card if remove cards is enabled
	if($("#removeCards").attr('checked')){
		cards.remove(cards.indexOf(card));
		if(cards.length == 0){
			//If no cards left - reset pack
			$.resetPack();
		}
	}
	$("#cardsLeft").html((((cards.length==13 & !$("#wholePack").attr('checked')) || cards.length==52)?"<u>"+cards.length+"</u>":cards.length) + " " +(cards.length>1?"cards":"card"));
};

//Determine if correct, update picture and text
$.displayTurnResults = function(nextCard,correctGuess){

	var oldPlayerName = players[currentPlayer];
	
	//Check fro winning streak
	var winningRun = 0;
	
	if(correctGuess){
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
	}
	
	//Update DB if not a test player
	if(oldPlayerName.indexOf("Player ") == -1){
		$.ajax({
			type: "POST",
			url: "editPlayer.php",
			data: "name="+oldPlayerName+"&maxFingers="+(correctGuess?0:currentBet)+"&maxCorrect="+winningRun,
			dataType: "json",
			success: function(msg){							
				//Updated!
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				// Error!
			}
		});
	}
	
	
	//Show Lee if wrong
	if(!correctGuess){
		//Show Lee
		if(currentBet > 0){
			$("#drinkMessage").html("<b>"+oldPlayerName + "</b> you must drink...<br/><span id='numFingers'>"+(currentBet>1?currentBet + " " + drinkType + "s!":currentBet + " " + drinkType + "!")+"</span>");
		}
		else{
			$("#drinkMessage").html("<b>"+oldPlayerName + "</b> you must drink...<br/>&nbsp;");
		}
		//Reset bet since all fingers drank!
		currentBet =0;
		//Show Lee
		setTimeout('$.openDialog()', 700);
	}
	
	//Update fingers	
	$("#totalNumFingers").text(currentBet + " " + ((currentBet>1 || currentBet==0)?drinkType +"s":drinkType));
	//Update the score on score tab
	$.updateScore(correctGuess, currentPlayer);
	
	//Set the next player and change text
	$.setNextPlayer();
	$("#playerName").html("<strong>"+players[currentPlayer] + "</strong> guess Higher or Lower!");
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


//Reset the pack
$.resetPack = function(){
	if($("#wholePack").attr('checked')){
		cards = new Array();
		for(var i =2;i<15;i++){
			cards.push("h"+i);
			cards.push("d"+i);
			cards.push("c"+i);
			cards.push("s"+i);
		}
	}
	else{
		cards = new Array();
		for(var i =2;i<15;i++){
			cards.push("h"+i);

		}
	}
};

$.compareCards = function(next,current){
	//Returns true if card 1 >= card 2
	return (parseInt(next.substring(1)) >= parseInt(current.substring(1)));
};


Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

//Game variables
var players = new Array();
var playersScores = new Array();

var currentCard;
var currentPlayer = 0;
var currentBet = 0; 

var cards = new Array();

//Number of drinkers displayed in table
var maxDrinkerRows = 10;
//Drink type
var drinkType;