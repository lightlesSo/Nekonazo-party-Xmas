function flash(name){
	const PING_INTERVAL=38000;
	const PING_TIMEOUT=15000;
//	const WS_PORT="8081";
	const MIN_LINETO_TIMEOUT_STEPS=30;
	const TIMEOUT_WAIT_ROOM_LOAD=100;
	const DRAWLINE_JUMPOVER_TIMEOUT_STEPS_WEIGHT=10;
	const SEND_STEPS_INTERVAL=999;
	const DRAW_DIGITS=2;
	const DRAW_PILES=20;
	const NAME_ID_PREFIX="user-";
	const GET_ROOMS_INTERVAL=1417;  
	const WAIT_TIMEOUT=3000;

	let realboard=document.getElementById("realboard");
	let canvas=document.getElementById("board");

	let ctx=canvas.getContext('2d');
	let canvasHeight=canvas.height;
	let canvasWidth=canvas.width;
	let canvasStack=[];
	let canvasPointer=0;
	let canvasLen=0;
	let maxLength=77;
	let ws;
	let waitPong=false;
	let  room;
	let state="login";		
	let gameState="not";
	ctx.lineCap='round';
	ctx.lineJoin="round";
	
	let pen;
	let sendDrawStack=[];
	let sendingDrawStack=false;
	let sendDrawBegin=0;
	let sendDrawEnd=-1;
	let drawStack=[];
	let drawDone=true;
	let downUpLineNum=0;
	function sendDrawSteps(step){  
		sendDrawEnd++;
		drawStack.push(step);
		sendDrawStack.push(step);  
		if(sendingDrawStack===true){
		}
		else{	
			ws.send(JSON.stringify({"type":"draw","type2":"lineTo","content":[sendDrawStack,sendDrawBegin,sendDrawEnd]}));
			sendDrawStack=[];
			sendingDrawStack=true;
			sendDrawBegin=sendDrawEnd+1;
		}
	}
	function ctrlZ(){
			if(canvasPointer>0){
				canvasPointer=canvasPointer-1;
				ctx.putImageData(canvasStack[canvasPointer],0,0);
			}
			else{
				console.log("ctrlZ tou");
			}
		}
	function ctrlY(){
		if(canvasPointer<canvasLen-1){
			canvasPointer=canvasPointer+1;
			ctx.putImageData(canvasStack[canvasPointer],0,0);
		}
		else{
			console.log("ctrlY tou");
		}
	}
	window.onkeydown=function(event){
		if(gameState==="draw"&&state==="room"&&event.ctrlKey){
			if(event.keyCode===89){
				sendDrawSteps({"ctrl":"ctrlY"});
				ctrlY();
			}
			else if(event.keyCode===90){
			sendDrawSteps({"ctrl":"ctrlZ"});
				ctrlZ();
			}
		}
	}
	function drawListener(event){  
		event.preventDefault();
		let heightMul=canvasHeight/canvas.offsetHeight;
		let widthMul=canvasWidth/canvas.offsetWidth;
		let [offsetX,offsetY]=[realboard.offsetLeft-canvas.offsetLeft,realboard.offsetTop-canvas.offsetTop];
		let currentX=((offsetX+event.offsetX)*widthMul).toFixed(DRAW_DIGITS);
		let currentY=((offsetY+event.offsetY)*heightMul).toFixed(DRAW_DIGITS);
		let aLineArray=[];
		let lineSteps=[];
		let timer;
		
		(function(){
			let step={};
				ctx.beginPath();
				pen.setCtxPressure(ctx,event);
				ctx.moveTo(currentX,currentY);   
				currentX=((event.offsetX+offsetX)*widthMul).toFixed(DRAW_DIGITS);
				currentY=((offsetY+event.offsetY)*heightMul).toFixed(DRAW_DIGITS);
				ctx.lineTo(currentX,currentY);
				step.endX=currentX;
				step.endY=currentY;
				ctx.stroke(); 
				lineSteps.push(step);
				aLineArray.push({x:currentX,y:currentY});
			})(); 
		
		
		function endPaint(event){
			realboard.onpointermove=null;
			realboard.onpointerup=null;
			realboard.onpointerleave=null;
			
			if(canvasPointer<maxLength){
				canvasPointer=canvasPointer+1;
				canvasLen=canvasPointer;  
				canvasStack[canvasPointer]=ctx.getImageData(0,0,canvasWidth,canvasHeight);
			}
			else{
				canvasStack[canvasPointer+1]=ctx.getImageData(0,0,canvasWidth,canvasHeight);
				canvasStack=canvasStack.slice(-maxLength);
			}
			clearInterval(timer);
			sendDrawSteps({"lineSteps":lineSteps,downUpLineNum:downUpLineNum});
			lineSteps=[];
			downUpLineNum++;
		}
		realboard.onpointerup=endPaint;
		realboard.onpointerleave=endPaint;


		realboard.onpointermove=function(event){
			ctx.beginPath();
				if(aLineArray.length>DRAW_PILES){
					let aLineArrayPointer=aLineArray.length-DRAW_PILES;
					ctx.strokeStyle="rgba(0,0,0,0)";
					for(let i=0;i<DRAW_PILES;i++){
						ctx.lineTo(aLineArray[aLineArrayPointer+i].x,aLineArray[aLineArrayPointer+i].y)
						ctx.stroke();
					}
				}
				else{
					ctx.moveTo(aLineArray[aLineArray.length-1].x,aLineArray[aLineArray.length-1].y);
					ctx.stroke();
				}
			
		pen.setCtxPressure(ctx,event);
				
				let step={};
				currentX=((offsetX+event.offsetX)*widthMul).toFixed(DRAW_DIGITS);
				currentY=((offsetY+event.offsetY)*heightMul).toFixed(DRAW_DIGITS);
				ctx.lineTo(currentX,currentY);
				step.endX=currentX;
				step.endY=currentY;
				ctx.stroke(); 
				lineSteps.push(step);
				aLineArray.push({x:currentX,y:currentY});
			}
		 timer=setInterval(function(){
			if(lineSteps.length!==0){
				sendDrawSteps({"lineSteps":lineSteps,downUpLineNum:downUpLineNum});
				lineSteps=[];
			}
		},SEND_STEPS_INTERVAL);
	}
	function nameToId(name){
		return NAME_ID_PREFIX+name;
	}
	function idToName(id){
		return id.slice(NAME_ID_PREFIX.length);
	}
	const ROOM_ID_PREFIX="room-";
	function roomToId(room){
		return ROOM_ID_PREFIX+room;
	}
	function idToRoom(id){
		return id.slice(ROOM_ID_PREFIX.length);
	}
	function timeout(ms) {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}
	async function drawLine(drawStackPointer,steps){
		let pointer=0;
		steps=Math.floor(Math.pow(steps,1/3)); 
	
		let drawJsons=[]
		for(let i=0;drawJsons.length<DRAW_PILES;i++){
			let steps=drawStack[drawStackPointer-i];
			
			if(steps===undefined||steps.downUpLineNum!==drawStack[drawStackPointer].downUpLineNum){
				break;
			}
			else{
				drawJsons=steps.lineSteps.concat(drawJsons);
			}
		}
		ctx.beginPath();
		while(drawJsons[pointer]!==undefined){
			
				ctx.beginPath();
				if(DRAW_PILES<pointer){
					ctx.strokeStyle="rgba(0,0,0,0)";
					for(let i=DRAW_PILES;i>0;i--){
						ctx.lineTo(drawJsons[pointer-i].endX,drawJsons[pointer-i].endY);
						ctx.stroke();
					}
				}
				else if(pointer>0){
					ctx.lineTo(drawJsons[pointer-1].endX,drawJsons[pointer-1].endY);
					ctx.stroke();
				}
				else{
					ctx.lineTo(drawJsons[pointer].endX,drawJsons[pointer].endY);
					ctx.stroke();
				}
				
				pen.setCtxPressure(ctx,{});
				
				ctx.lineTo(drawJsons[pointer].endX,drawJsons[pointer].endY);
				ctx.stroke();
				pointer=pointer+1;
				if(pointer%steps===0){
					await timeout(0);
				}
		}
		ctx.stroke();
		if(canvasPointer<maxLength){
			canvasPointer=canvasPointer+1;
			canvasLen=canvasPointer;  
			canvasStack[canvasPointer]=ctx.getImageData(0,0,canvasWidth,canvasHeight);
		}
		else{
			canvasStack[canvasPointer+1]=ctx.getImageData(0,0,canvasWidth,canvasHeight);
			canvasStack=canvasStack.slice(-maxLength);
		}
		  return new Promise((resolve) => {
			resolve();
		  });
	}
	let timeLimitInterval;
	function displayTimeLimit(timeLimit){
		if(gameState==="draw"){
			milliTimeLimit=timeLimit*1000;
			let restTime=new Date(milliTimeLimit);					
			let timeLimitDiv=document.getElementById("drawTimeLimit");
			timeLimitDiv.innerText=restTime.getMinutes()+" : "+restTime.getSeconds();
			return setInterval(function(startTime){			
				restTime.setTime(milliTimeLimit-(Date.now()-startTime));
				if(restTime<0){
					clearInterval(timeLimitInterval);
				}
				else{
					timeLimitDiv.innerText=restTime.getMinutes()+" : "+restTime.getSeconds();
						
				}
			},1000,Date.now());
		}
		else if(gameState==="guess"){
			let timeLimitDiv=document.getElementById("clock-num");
			timeLimitDiv.innerText=timeLimit;
			return setInterval(function(startTime){
				let restTime=Math.round(timeLimit-(Date.now()-startTime)/1000);
				if(restTime<0){
					clearInterval(timeLimitInterval);
				}
				else{
					timeLimitDiv.innerText=restTime;
						
				}
			},1000,Date.now());
		}
	}
	function gameStart(content){
		if(state==="room"){
			if(canvasLen===0){
				gameState=content.gamestate;
				let timeLimit=content.timelimit;
				let nazo=content.nazo;
				let nazoDiv=document.getElementById("puzzle-text");
				let tipsDiv=document.getElementById("tips");
				let drawingNameDiv=document.getElementById("drawing-name");
				for(let character of document.getElementsByClassName("character")){
					character.classList.remove("ready");
				}
				tipsDiv.innerText=nazo.tips;
				drawingNameDiv.innerText=content.drawname;
				if(gameState==="draw"){
					realboard.onpointerdown=drawListener;
					nazoDiv.innerHTML="谜底: &ensp; "+"<span>"+nazo.nazo+"</span>";
					document.getElementById("draw-tool").style.display="block";
					document.getElementById("clock").style.display="none";
					document.getElementById("drawTimeLimit").style.display="block";
				}
				else if(gameState==="guess"){
					realboard.onpointerdown=null;
					nazoDiv.innerHTML="绘画者: &ensp;&ensp; "+"<span>"+content.drawname+"</span>"+" &ensp;さん";
					document.getElementById("draw-tool").style.display="none";
					document.getElementById("drawTimeLimit").style.display="none";
					document.getElementById("clock").style.display="block";;
				}
				else{
					
				}
				
				timeLimitInterval=displayTimeLimit(timeLimit);
			}
			else{
				initTurn(); //补丁大法
				gameStart(content);
			}
		}
	}
	
	function inRoom(roomGameState,characters){
		document.getElementById("login").style.display="none";
		document.getElementById("rooms").style.display="none";
		document.getElementById("flash").style.display="block";
		document.getElementById("bgmusic").pause();
		
		let inputBox=document.getElementById("input-box");
		inputBox.onsubmit=function(e){
			let sendingMessage= e.target["input-text"].value;
			let content={};
			if(state="room"){
				e.target["input-text"].value="";
				switch(gameState){
					case "guess":
						content={
							message:sendingMessage
						};
						ws.send(JSON.stringify({"type":"message","type2":"guess","content":content}));
					break;
					case "draw":
					case "ready":
					case "notready":
						content={
							message:sendingMessage
						};
						ws.send(JSON.stringify({"type":"message","type2":"room","content":content}));
					break;
				}
			}
		}
		if(undefined===pen){
			pen=Palette.palette(document.getElementById("palette"),document.getElementById("brushs"),function(newStyles){
				pen.setCtx(ctx);
				if(gameState==="draw") 
				sendDrawSteps({"ctrl":"setPen",penStyles:newStyles});
			},DRAW_PILES);
		}
		initTurn();
		document.getElementById("draw-tool").style.display="none";
		document.getElementById("drawTimeLimit").style.display="none";
		
		pen.setCtxPressure(ctx,{});
		[canvas.style.width,canvas.style.height]=
		[realboard.offsetWidth*2,realboard.offsetHeight*2].map(x=>Math.floor(x));
		state="room";
		canvasStack.push(ctx.getImageData(0,0,canvasWidth,canvasHeight));

		for(let set of document.getElementsByClassName("character")){
			let characterName=characters.pop();
			if(characterName!==undefined){
				set.id=nameToId(characterName);
				set.dataset.name=characterName;
				set.getElementsByClassName("character-img")[0].src='favicon.ico';
			}
			else{
				set.id=nameToId(name);
				set.dataset.name=name;
				set.getElementsByClassName("character-img")[0].src='favicon.ico';

				break;
			}
		}
		if(roomGameState==="game"){
			gameState="guess";
			let getDrawStack={"type":"game","type2":"getDrawStack","content":{/*"room":room*/}};
			ws.send(JSON.stringify(getDrawStack));	
		}
		else{
			let getReady={"type":"game","type2":"getReady","content":{/*"room":room*/}};
			ws.send(JSON.stringify(getReady));
		}
		document.getElementById(nameToId(name)).onclick=function(e){
			if(state==="room"&&gameState!=="draw"&&gameState!=="guess" ){
				if(document.getElementById(nameToId(name)).classList.contains("ready")){
					let setReady={"type":"game","type2":"setReady","content":{"gamestate":"notready",/*"room":room,*/"name":name}};
					ws.send(JSON.stringify(setReady));
				}
				else{
					let setReady={"type":"game","type2":"setReady","content":{"gamestate":"ready",/*"room":room,*/"name":name}};
					ws.send(JSON.stringify(setReady));
				}
			}
		};
		document.getElementById("exitroom").onclick=function(e){
			let exitRoom={"type":"account","type2":"exitRoom","content":{"room":room,"name":name}};
			ws.send(JSON.stringify(exitRoom));
		}
	}

	function enterRoom(content){
		if(content.status==="ok"&&state==="rooms"){
			room=content.room;
			inRoom(content.roomgamestate,content.characters);   
		}
		else if(content.status==="full"&&state==="rooms"){
			console.log("full");
		}
	}
	function getNewRoomName(){
		let roomNames=[];
		for(let r of document.getElementsByClassName("room")){
			roomNames.push(Number(idToRoom(r.id)));
		}
		for(let i=0;;i++){
			if(!roomNames.includes(i)){
				return String(i);
				break;
			}
		}
	}
	function getCurrentRoomsOnce(delay){
		setTimeout(function(){
			ws.send(JSON.stringify({type:"room",type2:"getcurrentrooms",content:{}}));
		},delay);
		
	}
	function getCurrentRooms(){
		
		if(state!=="rooms")
			return;
		ws.send(JSON.stringify({type:"room",type2:"getcurrentrooms",content:{}}))
		setTimeout(function(){					
			getCurrentRooms();
		},GET_ROOMS_INTERVAL)
	}
	function snow(snowDiv){
		let realInterval;
		function realSnowOnce(){
			Snow.real(snowDiv,{onclick:function(){
					realSnowOnce();
				}
			},100,500);
		}
		function realSnow(){
			if(state==="rooms"){
				setTimeout(realSnow,1000+Math.floor(Math.random())*6000);
				realSnowOnce();
			}
		}
		realSnow();
		function virtualSnow(){
			if (state==="rooms"){
				setTimeout(virtualSnow,100+Math.floor(Math.random())*1000);
				Snow.down(snowDiv,50,100);
			}			
		}
		virtualSnow();
	}
	function toRooms(){	
		for(let set of document.getElementsByClassName("character")){
			set.id="";
			set.dataset.name="";
			set.className="character"; 
		}
		document.getElementById("flash").style.display="none";
		document.getElementById("login").style.display="none";
		document.getElementById("rooms").style.display="block";
		state="rooms";
		document.getElementById("bgmusic").play();
		snow(document.getElementById("snow"));
		let sixRooms=document.getElementById("six-rooms");
		sixRooms.onclick=function(e){
			if(e.target.classList.contains("room")){
				let roomId=idToRoom(e.target.id);
				let enterRoom={"type":"account","type2":"enterRoom","content":{"room":roomId}};
				ws.send(JSON.stringify(enterRoom));
			}
		}	
		document.getElementById("room-999").onclick=function(e){	
			
			document.getElementById("login").style.display="none";
			document.getElementById("rooms").style.display="none";
			document.getElementById("flash").style.display="block";
			document.getElementById("bgmusic").pause();
			if(undefined===pen){
				pen=Palette.palette(document.getElementById("palette"),document.getElementById("brushs"),function(newStyles){
					pen.setCtx(ctx);
				},DRAW_PILES);
			}
			initTurn();
			realboard.onpointerdown=drawListener;
			document.getElementById("drawTimeLimit").style.display="none";				
			document.getElementById("draw-tool").style.display="block";				
			pen.setCtxPressure(ctx,{});
			[canvas.style.width,canvas.style.height]=
			[realboard.offsetWidth*2,realboard.offsetHeight*2].map(x=>Math.floor(x));
			state="room";
			canvasStack.push(ctx.getImageData(0,0,canvasWidth,canvasHeight));
			document.getElementById("exitroom").onclick=function(e){
				toRooms();
			}
		}
		function createRoom(e){
			let newRoomName=getNewRoomName();
			let addroom={type:"room",type2:"addroom",content:{room:newRoomName}};
			ws.send(JSON.stringify(addroom));
			let timeout=WAIT_TIMEOUT;
			//this.onclick=null;
			this.style.pointerEvents="none";
			sixRooms.style.pointerEvents="none";
			let button=this;
			getCurrentRoomsOnce(500);
			function proc(){
				timeout=timeout-200;
				if(timeout<0){
					button.style.pointerEvents="auto";
					sixRooms.style.pointerEvents="auto";
					return;
				}
				let newRoom=document.getElementById(roomToId(newRoomName));
				if(newRoom===null){
					setTimeout(proc,200);
				}
				else if(state==="rooms"){
					button.style.pointerEvents="auto";
					sixRooms.style.pointerEvents="auto";
					newRoom.click();
				}
			}
			proc();
		}
		document.getElementById("create-room").onclick=createRoom;
		getCurrentRooms();
	}
	function inoutRoom(content){
		if(state==="room"){
			if(content.state==="room"){ 
				messageBoxDisplayLine("Neko:&ensp; <span>"+content.name+"</span>加入绘画");
				for(let set of document.getElementsByClassName("character")){
					if(set.id===""){
						set.id=nameToId(content.name);
						set.dataset.name=content.name;
						set.getElementsByClassName("character-img")[0].src='favicon.ico';
						break;
					}
				}
			}
			else if(content.state==="rooms"){
				if(content.name===name){
					
					toRooms();  
				}
				else{
					messageBoxDisplayLine("Neko:&ensp;<span>"+content.name+"</span>离开了");
					document.getElementById(nameToId(content.name)).id="";
					document.getElementById(nameToId(content.name)).dataset.name="";
					document.getElementById(nameToId(content.name)).className="character";
				}
			}
		}
	}
	function setReady(content){
		if(state==="room"){
			if(content.name===name){
				gameState=content.gamestate;
			}
			if(content.gamestate==="ready"||content.gamestate==="guess"/*||content.gamestate==="draw"*/){ //？？？？
				document.getElementById(nameToId(content.name)).classList.add("ready");
			}
			else if(content.gamestate==="notready"){
				document.getElementById(nameToId(content.name)).classList.remove("ready");
			}
			else if(content.gamestate==="unknown"){
			}
			else if(content.gamestate==="notgame"){
			}
			else if(content.gamestate==="draw"){
			}
			else if(content.gamestate==="guess"){
			}
		}
	}
	function initTurn(){

		let nazoDiv=document.getElementById("puzzle-text");
		let timeLimitDiv=document.getElementById("clock-num");
		nazoDiv.innerHTML="";
		timeLimitDiv.innerText="";
		document.getElementById("tips").innerText="";
		document.getElementById("drawing-name").innerText="";
		clearInterval(timeLimitInterval);
		sendDrawStack=[];
		sendingDrawStack=false;

		drawStack=[];
		downUpLineNum=0;
		canvasStack=[];
		canvasPointer=0;
		
		canvasLen=0;	
		ctx.clearRect(0,0,canvasWidth,canvasHeight);				
		sendDrawBegin=0;
		sendDrawEnd=-1;
	}
	function timeUp(content){
		if (state==="room"){
			if(gameState==="guess"||gameState==="draw"){
				let rightword=content.rightword;
				messageBoxDisplayLine("Neko:&ensp;timeup!");
				initTurn();		
				gameState="ready";						
				
				messageBoxDisplayLine("------------------------------------");
			}
			if(gameState==="draw"){
			}
		}
	}
	function guessRight(content){
		if (state==="room"){
			if(gameState==="guess"||gameState==="draw"){
				let drawname=content.drawname;
				let guessrightname=content.guessrightname;
				messageBoxDisplayLine("Neko: <span>"+guessrightname+"</span>猜对了<span>"+drawname+"</span>的画!");
				initTurn();
				gameState="ready";

				messageBoxDisplayLine("------------------------------------");
			}
			if(gameState==="draw"){
			}
		}
	}
	function messageBoxDisplayLine(string){
		let messageBox=document.getElementById("message");
		let newLine=document.createElement("p");
		newLine.classList.add("roomMessageLine");
		newLine.innerHTML=string;
		messageBox.append(newLine);
	}
	function msgBubble(refElement,left,bottom,innerHTML,width){
		let bubble=document.createElement("div");
		let fontHeight=
		bubble.classList.add("msg-bubble");
		bubble.style.left=left;
		bubble.style.width=width;
		bubble.style.bottom=bottom;
		bubble.innerHTML=innerHTML;
		refElement.append(bubble);
		setTimeout(function(){bubble.remove();},3333);
	}
	function reciveRoomMessage(content){
		let refElement=document.getElementById(nameToId(content.name));
		msgBubble(refElement,"8%","104%",content.message);
		messageBoxDisplayLine("<span class=\"lname\">"+content.name+"</span>"+" &ensp;:&ensp; "+content.message);
	}
	function login(content){
		if(content.status==="ok"&&state==="login"){
			name=content.name;
			document.getElementById("N").style.display="block";
			setTimeout(function(){
				document.getElementById("N").style.display="none";
			},2000);
			document.getElementById("rooms-rb").firstElementChild.innerText=OAO;
			toRooms();
		
		}
		else if(content.status==="duplicate"&&state==="login"){
			console.log("duplicate");
			ws.close(412,"duplicate"); 
			console.log(ws.readyState);
			alert("重复的名字");
		}
		   
	}

	function setPen(penStyles){
		for(let x in penStyles){
			pen[x]=penStyles[x];
		}
	}
	async function lineTo(content){
		if(state==="room"&&gameState==="guess"){
			
			let begin=content[1];
			let end=content[2];
			let oneStep;
			for (let i=begin; i<=end;i++ ){
				drawStack[i]=content[0][i-begin];   
			}
			let steps=end-begin+1;
			oneStep=drawStack[sendDrawBegin];
			if(oneStep!==undefined&&drawDone){
				drawDone=false;
				if(steps>=MIN_LINETO_TIMEOUT_STEPS){
					await timeout(TIMEOUT_WAIT_ROOM_LOAD);  
				}
				for (; oneStep!==undefined ; sendDrawBegin++,oneStep=drawStack[sendDrawBegin]){
					switch(oneStep.ctrl){
						case undefined:
							await drawLine(sendDrawBegin,steps);
						break;
						case "ctrlZ":
							ctrlZ();
						break;
						case "ctrlY":
							ctrlY();
						break;			
						case "setPen":
							setPen(oneStep.penStyles);
						break;
					}
				}
				drawDone=true;
			}	
		}
	}
	function currentRooms(content){
		function refreshRooms(){
			let serverRoomList=content.roomlist; 
			let serverlRoomNameList=serverRoomList.map(function(r){
				return r.room;
			});
			let localRoomList=document.getElementById("six-rooms").getElementsByClassName("room");
			let localRoomNameList=[];
			for(let lRoom of localRoomList){
				localRoomNameList.push(idToRoom(lRoom.id));
			}
			let newRoomNameList=serverlRoomNameList.filter(function(roomName){
				if(localRoomNameList.includes(roomName)){
					return false;
				}
				else{
					return true;
				}
			});
			let remRoomNameList=localRoomNameList.filter(function(roomName){
				if(serverlRoomNameList.includes(roomName)){
					return false;
				}
				else{
					return true;
				}
			});
			for(let roomName of remRoomNameList){
				removeRoom({room:roomName});
			}
			
			for(let roomName of newRoomNameList){
				addRoom({room:roomName});
			}
			for (let r of serverRoomList){
				modifyRoomStatus({
					room:r.room,
					
						peoplenum: r.peoplenum,
						roomstatus:r.roomstatus
					
				});
			}
		}
		if(state==="rooms"){
			refreshRooms();					
		}
		else {
			let timeout=WAIT_TIMEOUT;
			function waitToRooms(){
				timeout=timeout-200;
				if(timeout<0){
					return;
				}
				if(state==="rooms"){
					refreshRooms();
				}
				else{
					setTimeout(waitToRooms,200);
				}
			}
			waitToRooms();
		}
	}
	function addRoom(content){
		if(state==="rooms"){
			let sixRooms=document.getElementById("six-rooms");
			let nRoom=document.createElement('div');
			let roomImage=document.createElement('div');
			nRoom.className="room";
			nRoom.id=roomToId(content.room);
			nRoom.dataset.id=(Array(3).join(0) +content.room).slice(-3);;
			nRoom.append(roomImage);
			sixRooms.append(nRoom);
		}
	}
	function removeRoom(content){
		if(state==="rooms"){
			document.getElementById(roomToId(content.room)).remove();
		}
	}
	function modifyRoomStatus(content){
		if(state==="rooms"){
			let roomName=content.room;
			let modifyRoom=document.getElementById(roomToId(roomName));
			modifyRoom.firstElementChild.dataset.peoplenum=content.peoplenum;
			modifyRoom.firstElementChild.dataset.roomstatus=content.roomstatus.toUpperCase();
		}
	}
	function WebSocketTest(name,port){
		ws = new WebSocket(`ws://${window.location.hostname}:${port}/?username=${name}`)//;  正式版    
	    ws.onopen = function(evt){
       }; 
       ws.onmessage = function (evt) {
		   let rec;
		   try{
				rec = JSON.parse(evt.data);
				switch(rec.type){
				case "account":
					switch(rec.type2){
						case "login":
							login(rec.content);
						break;
						case "enterRoom":
							enterRoom(rec.content);
						break;
						case "inoutroom":
							inoutRoom(rec.content);
						break; 
					}
				break;
				case "room":
					switch(rec.type2){
						case "currentrooms":
							currentRooms(rec.content);
						break;
						case "addroom":
							addRoom(rec.content);
						break;
						case "removeroom":
							removeRoom(rec.content);  
						break;
						case "modifystatus":
							modifyRoomStatus(rec.content);
						break;
					}
				break;
				case "game":
					switch(rec.type2){  
						case "getReady": 
							setReady(rec.content);
						break;	
						case "gameStart":
							gameStart(rec.content);
						break;
						case "timeup":
							timeUp(rec.content);
						break;
						case "guessright":
							guessRight(rec.content);
						break;
					}
				break;
				case "draw":
					switch(rec.type2){
						case "lineTo": 
							lineTo(rec.content);
						break;
					}
				break;
				case "message":
					switch(rec.type2){
						case "guess":
							reciveRoomMessage(rec.content);
						break;
						case "room":
							reciveRoomMessage(rec.content);
						break;
					}
				break;
			}
		   }
		   catch(e){
			   rec=evt.data;
			   switch(rec){
				   case "pong":
					waitPong=false;
				   break;
				   case "sendDrawStepsSuccess":
					sendingDrawStack=false;
				   break;
				   default:
				   break;
			   }
		   }
		  
			
       };               
       ws.onclose = function(){ 
          console.log("连接已关闭..."); 
          alert("连接已关闭..."); 
       };
	   ws.onerror = function(error) {
		   alert('WebSocket Error: ' + error);
		  console.log('WebSocket Error: ' + error);
		};
	   let pingPongInterval=setInterval(function(){
		   ws.send("ping");
		   waitPong=true;
		  let wait=setTimeout(function(){
			   if(waitPong){ 
				   console.log("timeout");
					ws.close();
					clearInterval(pingPongInterval);
			   }
			   else{
			   }
			   clearTimeout(wait);
		   },PING_TIMEOUT);
		   },PING_INTERVAL);
	}
	function send(type,type2,content){
		ws.send(JSON.stringify({type:type,type2:type2,content:content}));
	}
	WebSocketTest(name,WS_PORT);
}