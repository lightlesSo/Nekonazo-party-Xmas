/*
return proxy:{
	//mode: std|image 根据是否有imageData
	
	R 0~255
	G
	B
	alpha	0~1
	blurProportion 0~1
	lineAddShadowWidth		
	imageData
	styles:{
	//shadowBlur
	//shadowColor=rgb（rgb）
	//lineWidth
	}
}
	有压感时blur会变吗
*/

Palette=function(){
	const ALPHACIRCLE=3.5;
	const ALPHAACCURACY=0.01;
	function realAlpha(requiredAlpha,plies,accuracy){
		function mixAlpha(plies,alpha,mix){
			if(plies===0)
				return mix;
			else
				return mixAlpha(plies-1,alpha,alpha+(1-alpha)*mix)
		}
		let big=1,small=0;
		let ret=0.5;
		while(1){
			let thisAlpha=mixAlpha(plies,ret,0);
			if(Math.abs(thisAlpha-requiredAlpha)<accuracy){
				return ret;
			}
			else{
				if(thisAlpha>requiredAlpha){
					big=ret;
				}
				else{
					small=ret;
				}
				ret=(big+small)/2;
			}
		}
	}
	const DYNAMIC_STYLE=["imageTest","imageTest2","imageTest3"];
	let brushData={

		pencile:{
			blurProportion:0, 
			lineAddShadowWidth:2,
			alpha:1,
			imageData:function(color){
				return color;
			},
			getAlpha(plies){
				return realAlpha(this.alpha,plies,ALPHAACCURACY);
			}
		},
		eraser:{
			blurProportion:0, 
			alpha:1,
			lineAddShadowWidth:30,
			imageData:function(color){
				return color;
			},
			getAlpha(plies){
				return realAlpha(this.alpha,plies,ALPHAACCURACY);
			}
		},
		highlighter:{
			blurProportion:0, 
			alpha:0.2,
			lineAddShadowWidth:20,
			imageData:function(color){
				return color;
			},
			getAlpha(plies){
				return realAlpha(this.alpha,plies,ALPHAACCURACY);
			}
		},
		pen:{
			blurProportion:0, 
			lineAddShadowWidth:4,
			alpha:1,
			imageData:function(color){
				return color;
			},
			getAlpha(plies){
				return realAlpha(this.alpha,plies,ALPHAACCURACY);
			}
		},
		imageTest3:{//喷枪
			blurProportion:0, 
			alpha:1,
			lineAddShadowWidth:12,
			imageData:function(color){
				let n=3;
				let canvas=document.createElement("canvas");		
				let w=13*n;
				[canvas.height,canvas.width]=[w,w];				
				let ctx=canvas.getContext("2d");
				ctx.fillStyle=color;
				for(let i=0;i<n*n;i++){
					ctx.beginPath();
					ctx.arc(Math.random()*w,Math.random()*w,0.5,0,Math.PI*2);
					ctx.fill();
				}
				return ctx.createPattern(canvas, "repeat");
			},
			getAlpha(plies){
				return realAlpha(this.alpha,Math.floor(plies/10),ALPHAACCURACY);
			}
		},
	}
	function rgbToHsl(r,g,b){
		let [R,G,B]=[r/255,g/255,b/255];
					let maxcolor=Math.max(R,G,B);
					let mincolor=Math.min(R,G,B);
					let L=(maxcolor + mincolor)/2;
					let S=L<0.5? (maxcolor-mincolor)/(maxcolor + mincolor): (maxcolor-mincolor)/(2.0-maxcolor-mincolor);
					if(S===undefined){
						S=0;
					}
					let H;
					if((maxcolor-mincolor)===0){
						H=0;
					}
					else if(R===maxcolor){
						H=((G-B)/(maxcolor-mincolor))%6;
					}
					else if(G===maxcolor){
						H=2+(B-R)/(maxcolor-mincolor);
					}
					else if(B===maxcolor){
						H=4+(R-G)/(maxcolor-mincolor);
					}
					H=H*60;
					if(H<0) H=H+360;
					
		return {H:H,S:S,L:L};
	}

	function pal(element,brushElement,callback,plies){
		if(callback===undefined){
			callback=function(x){}
		}
		if(plies===undefined){
			plies=1;
		}
		let prc={
			set:function(obj, prop, value) {
				obj[prop] = value;					
				switch(prop){
					case 'rgb':
						obj.styles.strokeStyle=brushData[obj.brush].imageData(`rgba(${obj.rgb.R},${obj.rgb.G},${obj.rgb.B},1)`);
						obj.styles.shadowColor=`rgb(${obj.rgb.R},${obj.rgb.G},${obj.rgb.B})`;
						obj.styles.globalAlpha=brushData[obj.brush].getAlpha(plies);
						setBackground();
					break;
					case 'alpha':
						brushData[obj.brush].alpha=value;
						obj.styles.globalAlpha=brushData[obj.brush].getAlpha(plies);
					break;
					case 'blurProportion':
						brushData[obj.brush].blurProportion=value;
						obj.styles.lineWidth=brushData[obj.brush].lineAddShadowWidth*(1-brushData[obj.brush].blurProportion);
						obj.styles.shadowBlur=brushData[obj.brush].lineAddShadowWidth*brushData[obj.brush].blurProportion;						
					break;
					case 'lineAddShadowWidth':
						brushData[obj.brush].lineAddShadowWidth=value;
						obj.styles.lineWidth=brushData[obj.brush].lineAddShadowWidth*(1-brushData[obj.brush].blurProportion);
						obj.styles.shadowBlur=brushData[obj.brush].lineAddShadowWidth*brushData[obj.brush].blurProportion;
						
					break;
					case 'brush':					
						obj.styles.strokeStyle=brushData[obj.brush].imageData(`rgba(${obj.rgb.R},${obj.rgb.G},${obj.rgb.B},1)`);
						obj.styles.shadowColor=`rgb(${obj.rgb.R},${obj.rgb.G},${obj.rgb.B})`;
						obj.styles.globalAlpha=brushData[obj.brush].getAlpha(plies);
						obj.styles.lineWidth=brushData[obj.brush].lineAddShadowWidth*(1-obj.blurProportion);
						obj.styles.shadowBlur=brushData[obj.brush].lineAddShadowWidth*obj.blurProportion;
						alpha.children[1].style.top=brushData[obj.brush].alpha*alpha.offsetHeight-ALPHACIRCLE;
						blurs.selected.style.boxShadow="";
						for (let x of blurs.children){
							if (x.dataNum===brushData[obj.brush].blurProportion){
								blurs.selected=x;
								x.style.boxShadow="inset 0 0 0 0.15em red";
								blurs.scrollTop=x.offsetTop-2*x.offsetHeight;
								break;
							}
						} 
						thicknesses.selected.style.boxShadow="";
						for (let x of thicknesses.children){
							if (x.dataNum===brushData[obj.brush].lineAddShadowWidth){
								thicknesses.selected=x;
								x.style.boxShadow="inset 0 0 0 0.15em red";
								thicknesses.scrollTop=x.offsetTop-2*x.offsetHeight;
								break;
							}
						} 
					break;
				}
				callback({[prop]:value});					
			}
		}
		//需要rgb一起赋值
		let pen=new Proxy({ 
			rgb:{R:0,G:0,B:0},alpha:1, 
			blurProportion:0,   
			lineAddShadowWidth:4, 
			brush:'pen',
			styles:new Proxy({
					strokeStyle:`rgba(0,0,0,1)`,
					lineWidth:4,
					shadowBlur:0,
					shadowColor:`rgb(0,0,0)`,	
			},{get:function(obj,prop,proxy){
				if(prop==="strokeStyle"&&DYNAMIC_STYLE.includes(pen.brush)){  
					return brushData[pen.brush].imageData(`rgba(${pen.rgb.R},${pen.rgb.G},${pen.rgb.B},1)`);
				}
				else{
					return obj[prop];
				}
			}
			}) ,
			setCtx:function(ctx){
				for(let x in this.styles){
					ctx[x]=this.styles[x];
				}
			},
			setCtxPressure:function(ctx,pointerEvent){  //发送时可以人工合成一个pointerEvent{} 绘画时也用这个也行 只需要有压力种类属性就行,或者可以加夹角旋转切向力
				ctx.strokeStyle=pen.styles.strokeStyle;
				if(pointerEvent.pointerType==="pen"){
					ctx.globalAlpha=pointerEvent.pressure*pen.styles.globalAlpha;//pressure
				}
				else{
				}
			}
		},prc);  

		let strokeStyle="pen";
		let strokeStyles={
			"pen":function(){
				let rgba = 'rgba(' + pen.rgb.R+ ',' + pen.rgb.G +
							 ',' + pen.rgb.B + ',' + pen.alpha + ')';
				return rgba;
			}
		}
		function setBackground(source){ 
			if(paletteCircleContainer.rgb.R!==pen.rgb.R||
			paletteCircleContainer.rgb.B!==pen.rgb.B||
			paletteCircleContainer.rgb.G!==pen.rgb.G){
					let hsl=rgbToHsl(pen.rgb.R,pen.rgb.G,pen.rgb.B);
					let circleX=circleW/2,circleY=circleH/2,inR=circleW*0.35,R=circleW*0.4;
					let e=new Event('mousedown');
					let angle=Math.PI/180;
					e.offsetX=circleX;
					e.offsetY=circleY-R;
					paletteCircleContainer.children[0].dispatchEvent(e);
					let percentY=1.5*inR/101,
						topY=circleY-inR,
						halfBottom=(Math.pow(3,1/2)*inR/2);
					e.offsetX=circleX+(hsl.L-0.5)*halfBottom*2;
					e.offsetY=((1-hsl.S)*100+1)*percentY+topY;
					paletteCircleContainer.children[0].dispatchEvent(e);
					e.offsetY=circleY-R*Math.cos(angle*hsl.H);
					e.offsetX=circleX+R*Math.sin(angle*hsl.H);
					paletteCircleContainer.children[0].dispatchEvent(e);
					paletteCircleContainer.children[0].dispatchEvent(new Event('mouseup'));
					
				}
			
				let rgb = 'rgb(' + pen.rgb.R+ ',' + pen.rgb.G +
							 ',' + pen.rgb.B+')';
				selectedColors.leftSelected.style.backgroundColor=rgb;
				alpha.firstChild.style.background=" linear-gradient(to bottom, rgba("+pen.rgb.R+", "+pen.rgb.G+", "+pen.rgb.B+", 0) 0%, rgb("+pen.rgb.R+", "+pen.rgb.G+", "+pen.rgb.B+") 100%)";
			
		}
		
		let h=element.offsetHeight;
		let w=element.offsetWidth-17;
		[w,h]=Array(2).fill((w*0.8/1.11<h?w:h/0.8*1.11)/1.15);
		h=w*0.8;
		[circleW,circleH]=Array(2).fill(h*0.9);

		
		let paletteCircleContainer=document.createElement("div");
		paletteCircleContainer.rgb={R:255,G:0,B:0};
		(function(){
			let paletteCircle=document.createElement("canvas");
			paletteCircle.width=circleW;
			paletteCircle.height=circleH;
			paletteCircle.style.top=0;
			paletteCircle.style.cursor="crosshair";
			paletteCircle.style.right=0.1*w;
			paletteCircle.style.position="absolute";
			paletteCircle.style.display="block";		
			let ptx=paletteCircle.getContext('2d');	
			let circle=paletteCircle.cloneNode();
			circle.style.pointerEvents="none";
			let ctx=circle.getContext('2d');
			ctx.strokeStyle="black";
			
			let circleX=circleW/2,circleY=circleH/2,outR=circleW*0.45,inR=circleW*0.35;
			for(let i=0,hue=Math.PI*2/360;i<360;i++){
				ptx.fillStyle='hsl('+i+',100%,50%)';
				ptx.beginPath();
				ptx.moveTo(circleX,circleY);
				ptx.arc(circleX,circleY,outR,(i-90)*hue,(i+1-90)*hue);
				ptx.fill();
			}
			ptx.beginPath();
			ptx.fillStyle='rgb(255,255,255)';
			ptx.arc(circleX,circleY,inR,0,Math.PI*2);
			ptx.fill();
			for(let percentY=1.5*inR/101,i=101,
			topY=circleY-inR,color=0,
			halfBottom=(Math.pow(3,1/2)*inR/2),
			halfPercentBottom=halfBottom/101;i>0;i--){
				let lineargradient =ptx.createLinearGradient(circleX-halfBottom,0,circleX+halfBottom,0);
				lineargradient.addColorStop(0,'hsl('+color+','+(101-i)+'%,0%)');  
				lineargradient.addColorStop(0.5,'hsl('+color+','+(101-i)+'%,50%)');
				lineargradient.addColorStop(1,'hsl('+color+','+(101-i)+'%,100%)');
				ptx.fillStyle=lineargradient;
				ptx.beginPath();
				ptx.moveTo(circleX,topY);
				ptx.lineTo(circleX+halfPercentBottom*i,topY+i*percentY);
				ptx.lineTo(circleX-halfPercentBottom*i,topY+i*percentY);
				ptx.lineTo(circleX,topY);
				ptx.fill();	
			}
			let colorPosition={selectedAngle:0,angle:0,x:0,y:0};
			function setTriangle(e){
				let eventR=Math.pow(Math.pow(e.offsetX-circleX,2)+Math.pow(e.offsetY-circleY,2),1/2);
				if(eventR>inR+1&&eventR<outR-1){ 
					let pixel = ptx.getImageData(e.offsetX, e.offsetY, 1, 1);
					let data = pixel.data;
					let H=rgbToHsl(data[0],data[1],data[2]).H
					let radian=Math.atan((e.offsetX-circleX)/(e.offsetY-circleY));
					ptx.beginPath();
					ptx.fillStyle='rgb(255,255,255)';
					ptx.arc(circleX,circleY,inR,0,Math.PI*2);
					ptx.fill();
					ptx.save();
					ptx.translate(circleX,circleY);
					if((e.offsetY-circleY)<0){
						ptx.rotate(-radian);
						colorPosition.angle=-radian;
					}
					else if((e.offsetX-circleX)<0){
						ptx.rotate(-radian+Math.PI);
						colorPosition.angle=-radian+Math.PI;
					}
					else {
						ptx.rotate(-radian-Math.PI);
						colorPosition.angle=-radian-Math.PI;
					}
					ptx.translate(-circleX,-circleY);
					for(let percentY=1.5*inR/101,i=101,
					topY=circleY-inR,color=H,
					halfBottom=(Math.pow(3,1/2)*inR/2),
					halfPercentBottom=halfBottom/101;i>0;i--){
						let lineargradient =ptx.createLinearGradient(circleX-halfBottom,0,circleX+halfBottom,0);
						lineargradient.addColorStop(0,'hsl('+color+','+(101-i)+'%,0%)');
						lineargradient.addColorStop(0.5,'hsl('+color+','+(101-i)+'%,50%)');
						lineargradient.addColorStop(1,'hsl('+color+','+(101-i)+'%,100%)');
						ptx.fillStyle=lineargradient;
						ptx.beginPath();
						ptx.moveTo(circleX,topY);
						ptx.lineTo(circleX+halfPercentBottom*i,topY+i*percentY);
						ptx.lineTo(circleX-halfPercentBottom*i,topY+i*percentY);
						ptx.lineTo(circleX,topY);
						ptx.fill();	
					}
					ptx.restore();
					
					if(colorPosition.x!==0){
						ctx.clearRect(0,0,circleW,circleH);
						ctx.save();
						ctx.translate(circleX,circleY);
						ctx.rotate(colorPosition.angle-colorPosition.selectedAngle);
						ctx.translate(-circleX,-circleY);
						ctx.beginPath();
						ctx.arc(colorPosition.x,colorPosition.y,3,0,Math.PI*2);
						ctx.stroke();
						ctx.restore();
											
						let angle=-(colorPosition.angle-colorPosition.selectedAngle);
						let rx=colorPosition.x-circleX;
						let ry=colorPosition.y-circleY;
						let Rx = rx* Math.cos(-angle)- ry * Math.sin(-angle)+circleX;
						let Ry = ry * Math.cos(-angle) + rx * Math.sin(-angle)+circleY;
						let pixel = ptx.getImageData(Rx, Ry, 1, 1);
						let data = pixel.data;
						if(!(data[0]===255&&data[1]===255&&data[2]===255)&&e.isTrusted===true){  
							paletteCircleContainer.rgb={R:data[0],G:data[1],B:data[2]};
							pen.rgb={R:data[0],G:data[1],B:data[2]};
						}
					}


				}
				else if(eventR<inR+1){
					paletteCircle.removeEventListener("mousemove",setTriangle);
				}
				
			}
			paletteCircle.addEventListener("mousedown",function(e){
				setTriangle(e);
				paletteCircle.addEventListener("mousemove",setTriangle);
			});
			paletteCircle.addEventListener("mouseup",function(e){
				paletteCircle.removeEventListener("mousemove",setTriangle);
			});
			paletteCircle.addEventListener("mouseleave",function(e){
				paletteCircle.removeEventListener("mousemove",setTriangle);
			});
			paletteCircle.addEventListener("mousedown",function(e){
				getColor(e);
				paletteCircle.addEventListener("mousemove",getColor);
			});
			paletteCircle.addEventListener("mouseup",function(e){
				paletteCircle.removeEventListener("mousemove",getColor);
			});
			paletteCircle.addEventListener("mouseleave",function(e){
				paletteCircle.removeEventListener("mousemove",getColor);
			});
			function getColor(e){
				let x = event.offsetX;
				let y = event.offsetY;
				let eventR=Math.pow(Math.pow(e.offsetX-circleX,2)+Math.pow(e.offsetY-circleY,2),1/2);
				if(eventR<inR-1){ /
					let pixel = ptx.getImageData(x, y, 1, 1);
					let data = pixel.data;
					if(!(data[0]===255&&data[1]===255&&data[2]===255)&&e.isTrusted===true){  //反正你也不会到这里找纯白吧
						paletteCircleContainer.rgb={R:data[0],G:data[1],B:data[2]};
						pen.rgb={R:data[0],G:data[1],B:data[2]};
						 colorPosition.x=x;
						 colorPosition.y=y;	
						 colorPosition.selectedAngle=colorPosition.angle;
						ctx.beginPath();
						ctx.clearRect(0,0,circleW,circleH);
						ctx.arc(x,y,3,0,Math.PI*2);
						ctx.stroke();
					}
					else{
						paletteCircle.removeEventListener("mousemove",getColor);
					}
				}
				else{
					paletteCircle.removeEventListener("mousemove",getColor);
				}
			}		
			paletteCircleContainer.style.position="relative";
			paletteCircle.style.zIndex=0;
			circle.style.zIndex=1;
			paletteCircleContainer.appendChild(paletteCircle);
			paletteCircleContainer.appendChild(circle);
		})();
	
		
		let paletteBlockContainer=document.createElement("div");
		(function(){
			let paletteBlock=document.createElement("canvas");
			let blockW=0.85*w;
			let blockH=blockW/16*13;
			paletteBlock.width=blockW;
			paletteBlock.height=blockH;
			paletteBlock.style.top=0;
			paletteBlock.style.cursor="crosshair";
			paletteBlock.style.right=0;
			paletteBlock.style.position="absolute";
			paletteBlock.style.display="block";		
			let column=16;
			let row=5;
			let ptxB=paletteBlock.getContext('2d');
			ptxB.strokeStyle="black";
			
			let paletteBlockSelected=document.createElement("div");
			paletteBlockSelected.style.width=blockW;
			paletteBlockSelected.style.height=blockH;
			paletteBlockSelected.style.top=0;
			paletteBlockSelected.style.right=0;
			paletteBlockSelected.style.position="absolute";
			paletteBlockSelected.style.display="grid";	
			paletteBlockSelected.style.gridTemplateColumns= "repeat("+column+", 1fr)";
			paletteBlockSelected.style.gridTemplateRows="repeat("+((row-1)*(row-2)+1)+", 1fr)";	
			paletteBlockSelected.style.pointerEvents="none";
			let selected=document.createElement("div");
			selected.style.boxShadow="inset 0 0 0 0.15em white";
			selected.style.width=blockW/column;
			selected.style.Height=blockW/column;
			paletteBlockSelected.appendChild(selected);
			for(let sh=0,
				s=100/(row-1),
				r=0,
				 a=blockW/column,
				 h=360/column,
				 radius=a*0.5;sh<=row;sh++){
				 if(sh<row){
					for(let lh=0,l=100/(row-1);lh<row;lh++){
						for(let hw=0;hw<column;hw++){
							if(sh!==0&&lh!==0&&lh!==row-1){
								ptxB.fillStyle='hsl('+h*hw+','+s*sh+'%,'+l*lh+'%)';
								ptxB.beginPath();
								ptxB.arc(a*hw+a/2,Math.floor(Math.floor(r/column)*a+a/2),radius,0,Math.PI*2);
								ptxB.fill();
								r++;
							}
						}
					}
				}
				else if(sh===row){
					for(let hw=0,l=100/(column-1),c=Math.floor(Math.floor(r/column)*a+a/2);hw<column;hw++){
						ptxB.fillStyle='hsl(0,0%,'+(column-1-hw)*l+'%)';
						ptxB.beginPath();
						ptxB.arc(a*hw+a/2,c,radius,0,Math.PI*2);
						ptxB.fill();
					}
				}
			}
			paletteBlock.onpointerdown=function(e){ 
				let colorRange=blockW/column;
				selected.style.gridColumn=Math.ceil(e.offsetX/colorRange);
				selected.style.gridRow=Math.ceil(e.offsetY/colorRange);
				let pixel = ptxB.getImageData(selected.offsetLeft+colorRange/2,selected.offsetTop+colorRange/2, 1, 1);
				let data = pixel.data;
				if(e.isTrusted===true){
					pen.rgb={R:data[0],G:data[1],B:data[2]};
				}
			}
			
			paletteBlockContainer.style.position="relative";
			paletteBlock.style.zIndex=0;
			paletteBlockSelected.style.zIndex=1;
			paletteBlockContainer.appendChild(paletteBlock);
			paletteBlockContainer.appendChild(paletteBlockSelected);
		})();
		
		
		let selectedColors=document.createElement("div");
		(function(){
			selectedColors.style.position="absolute";
			selectedColors.style.right=0;
			selectedColors.style.bottom=0;
			selectedColors.style.height=h-0.85*w/16*13;
			selectedColors.style.width=0.85*w;
			selectedColors.style.backgroundColor="rgb(39, 99, 222)";
			let colorBlock=document.createElement("button");
			colorBlock.style.height=0.047*w;
			colorBlock.style.width=0.047*w;
			colorBlock.style.backgroundColor="rgb(255,255,255)";
			colorBlock.style.margin=0.003*w;	
			colorBlock.style.borderWidth=0;
			colorBlock.style.padding=0;
			colorBlock.style.borderRadius="35%";
			colorBlock.style.cursor="pointer";
			for(let i=0;i<32;i++){
				
				selectedColors.appendChild(colorBlock.cloneNode(true));
			}
			selectedColors.leftSelected=selectedColors.firstElementChild;
			selectedColors.leftSelected.style.boxShadow="inset 0 0 0 0.15em black";
			selectedColors.onpointerdown=function(e){
				let block=e.target;
				if(e.button===0&&block.tagName==="BUTTON"){
					selectedColors.leftSelected.style.boxShadow="";
					selectedColors.leftSelected=block;
					selectedColors.leftSelected.style.boxShadow="inset 0 0 0 0.15em black";
				 	let[r,g,b]=block.style.backgroundColor.slice(4,-1).split(",").map(x=>Number(x));
					if(e.isTrusted===true){
						pen.rgb={R:r,G:g,B:b}
					}
				}
			}
		})();
				
		let thicknesses=document.createElement("div");
		(function(){
			let thinknessAmount=20;
			let thinkest=20;
			thicknesses.style.background="white";
			thicknesses.style.position="absolute";
			thicknesses.style.left=0.16*w;
			thicknesses.style.top=0;
			thicknesses.style.height="100%";
			let thicknessesWidth=0.14*w+17;
			thicknesses.style.width=thicknessesWidth;
			thicknesses.style.overflowY="scroll";
			thicknesses.style.overflowX="hidden";
			
			let thickCanvasWidth=thicknessesWidth-17;
			if(thickCanvasWidth/2<thinkest){
				thinknessAmount=Math.floor(thickCanvasWidth/2);
				thinkest=Math.floor(thickCanvasWidth/2);
			}
			let center=thickCanvasWidth/2;
			let thickCanvas=document.createElement("canvas");
			thickCanvas.width=thickCanvasWidth;
			thickCanvas.height=thickCanvasWidth;
			thickCanvas.style.cursor="crosshair";
			for(let i=thinknessAmount,r=thinkest/thinknessAmount,def=1;i>0;i=i-def){
				if(i<3){
					def=0.5;
				}
				let thisThickCanvas=thickCanvas.cloneNode(true);
				thisThickCanvas.dataNum=i*2;
				thisThickCanvas.onpointerdown=function(e){
					pen.lineAddShadowWidth=this.dataNum;
					thicknesses.selected.style.boxShadow="";
					thicknesses.selected=this;
					this.style.boxShadow="inset 0 0 0 0.15em red";
				}
				let ctx=thisThickCanvas.getContext('2d');
				ctx.fillStyle="black";
				ctx.beginPath();
				ctx.arc(center,center,r*i,0,Math.PI*2);
				ctx.fill();
				thicknesses.appendChild(thisThickCanvas);
			}		
			thicknesses.selected=thicknesses.childNodes[thinknessAmount-3];
			thicknesses.selected.style.boxShadow="inset 0 0 0 0.15em red";
		})();
    
		
		let tabButton=document.createElement("button");
		(function(){
			tabButton.style.position="absolute";
			tabButton.style.zIndex=7;
			tabButton.style.left=0;
			tabButton.style.bottom=0;
			tabButton.style.height=0.14*w;
			tabButton.style.width=0.14*w;
			tabButton.style.borderRadius="50%";
			tabButton.style.margin=0.003*w;
			tabButton.style.borderColor="#2766AB";
			tabButton.style.borderWidth="thin";
			tabButton.style.backgroundColor="#2766AB";
			tabButton.style.cursor="pointer";
			tabButton.style.backgroundSize="100%";
			tabButton.style.backgroundImage="url('data:img/png;base64,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')";
			tabButton.style.outline="none";
			tabButton.onclick=function(e){
				if(paletteCircleContainer.style.display==="none"){
					paletteCircleContainer.style.display="block";
					paletteBlockContainer.style.display="none";
				}
				else if(paletteCircleContainer.style.display==="block"){
					paletteCircleContainer.style.display="none";
					paletteBlockContainer.style.display="block";
				}
			}
		})();
		
		let blurs=document.createElement("div");
		(function(){
			let blurAmount=4;
			const SCROLLW=17;
			blurs.style.backgroundColor="white";
			blurs.style.position="absolute";
			blurs.style.left=0;
			blurs.style.display="grid";
			blurs.style.gridTemplateRows="auto";
			blurs.style.height="80%";
			let blursWidth=0.145*w+SCROLLW;
			blurs.style.width=blursWidth;
			blurs.style.overflowY="scroll";
			blurs.style.overflowX="hidden";
			let blurWidth=blursWidth-SCROLLW;
			let blurProto=document.createElement("canvas");
			[["width",blurWidth],["height",blurWidth]].map(function(x){blurProto[x[0]]=x[1]});
			blurProto.style.cursor="pointer";
			for(let i=0;i<blurAmount;i++){  
				let blur=blurProto.cloneNode(true);
				let ctx=blur.getContext("2d");
				ctx.fillStyle="black";
				ctx.beginPath();
				ctx.moveTo(0.2*blurWidth,0.75*blurWidth);
				ctx.lineTo(0.8*blurWidth,0.75*blurWidth);
				ctx.lineTo((0.8-(blurAmount-1-i)/(blurAmount-1)*0.27)*blurWidth,0.25*blurWidth);
				ctx.lineTo((0.2+(blurAmount-1-i)/(blurAmount-1)*0.27)*blurWidth,0.25*blurWidth);
				ctx.lineTo(0.2*blurWidth,0.75*blurWidth);
				ctx.fill();
				let blurProportion=(blurAmount-1-i)/(blurAmount-1)*0.9;
				blur.dataNum=blurProportion;
				blur.onpointerdown=function(e){
					pen.blurProportion=this.dataNum;
					blurs.selected.style.boxShadow="";
					blurs.selected=this;
					this.style.boxShadow="inset 0 0 0 0.15em red";
				}
				blurs.appendChild(blur);
		
			}
				blurs.selected=blurs.lastElementChild;
				blurs.selected.style.boxShadow="inset 0 0 0 0.15em red";
		})();
		
		let alpha=document.createElement("div");
		(function(){
			alpha.style.position="absolute";
			alpha.style.top=0;
			alpha.style.right=0;
			alpha.style.height=0.85*w/16*13;
			alpha.style.width=0.07*w;
			alpha.style.cursor="crosshair";
			alpha.style.boxSizing="border-box";
			alpha.style.borderWidth=0.02*h;
			alpha.style.borderColor="rgb(0, 188, 244)";
			alpha.style.backgroundImage="url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==)";
			let alphaBar=document.createElement("div");
			alphaBar.style.height="100%";
			alphaBar.style.width="100%";
			alpha.appendChild(alphaBar);
			let alphaDot=document.createElement("div");
			[["borderRadius","50%"],
			["height","5px"],["top","50%"],
			["width","5px"],["left","50%"],["pointerEvents","none"],
			["borderStyle","solid"],["borderWidth","2px"],["position","absolute"]
			].map(function(x){alphaDot.style[x[0]]=x[1]});
			alpha.appendChild(alphaDot);
			function getAlpha(e){
				let a=e.offsetY/alpha.offsetHeight;
				pen.alpha=a;
				alphaDot.style.top=e.offsetY-ALPHACIRCLE;
				alphaDot.style.left=e.offsetX-ALPHACIRCLE;
			}
			alphaBar.onpointerdown=function(e){
				getAlpha(e);
				alphaBar.onpointermove=getAlpha;			
			}
			alpha.onpointerleave=function(e){
				alphaBar.onpointermove="";
			}
			alpha.onpointerup=function(e){
				alphaBar.onpointermove="";
			}
		})();		
		let palette=document.createElement("div");
		paletteBlockContainer.style.top=0;
		paletteCircleContainer.style.top=0;
		palette.style.height=h;
		palette.style.width=w*1.15+17;
		palette.style.position="absolute";
		palette.style.pointerEvents="auto";
		palette.style.background="#5674D6";
		palette.style.boxShadow="#5674D6 0px 0px 0px 0.15em";
		paletteBlockContainer.style.zIndex=3;
		paletteCircleContainer.style.zIndex=3;
		paletteBlockContainer.style.display="block";
		paletteCircleContainer.style.display="none";
		selectedColors.style.zIndex=3;
		thicknesses.style.zIndex=2;
		blurs.style.zIndex=1;
		paletteCircleContainer.appendChild(alpha);
		palette.appendChild(selectedColors);
		palette.appendChild(paletteBlockContainer);
		palette.appendChild(paletteCircleContainer);
		palette.appendChild(thicknesses);
		palette.appendChild(tabButton);
		palette.appendChild(blurs);
		element.appendChild(palette);
		thicknesses.scrollTop=thicknesses.childElementCount*thicknesses.firstChild.height*0.7;
		setBackground();
		
		(function(){
			let brushType=8;
			let w=brushElement.offsetWidth*brushType/2<brushElement.offsetHeight?brushElement.offsetWidth:brushElement.offsetHeight*2/brushType;
			let h=w/2*brushType;
			let brushes=document.createElement("div");
			[["width",w],["height",h]
			].map(function(x){brushes.style[x[0]]=x[1]});
			let brushButtonProto=document.createElement("button");
			[["width",w/2],["height",w/2],["cursor","pointer"],["pointerEvents","auto"],["box-sizing","border-box"],
			["padding","0.2vh"],["border-radius","15%"],["background","none"]
			].map(function(x){brushButtonProto.style[x[0]]=x[1]});
			for (let x in brushData){
				let brushButton=brushButtonProto.cloneNode(true);
				brushButton.onclick=function(e){
					for(let b of brushes.children){
						b.style.boxShadow="none";
					}
					this.style.boxShadow="grey 2px 2px 0.1em,grey -2px -2px 0.1em";
					pen.brush=x;
				}
				brushes.appendChild(brushButton);
			}
			brushElement.appendChild(brushes);
		})();
		
		return pen;
	}
	return{
		palette:pal
	}
}();
