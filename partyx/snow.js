
Snow=(function(){ //min maxmul 是倍数，默认的是宽高1px
	let snow=document.createElement("div");
	snow.style.position='absolute';
	snow.style.borderRadius="50%";
	let virtualImages=["url(\"images/snowflake/snowflake1.png\")",
	"url(\"images/snowflake/snowflake2.png\")",
	"url(\"images/snowflake/snowflake3.png\")",
	"url(\"images/snowflake/snowflake4.png\")",
	"url(\"images/snowflake/snowflake5.png\")",
	"url(\"images/snowflake/snowflake6.png\")",
	"url(\"images/snowflake/snowflake7.png\")"];
	let realImages=virtualImages;
	let virtualSnow=snow.cloneNode(true);
	virtualSnow.style.pointerEvents="none";
	virtualSnow.style.zIndex=1;
	let virtualSnows=Array(5).fill(virtualSnow.cloneNode(true));
	virtualSnows=virtualSnows.map(function(snow,index){
		let color=virtualImages[index];
		let v=snow.cloneNode(true);
		v.style.background=color;
		v.style.backgroundSize="cover";
		return v;
	});
	let realSnow=snow.cloneNode(true);
	realSnow.style.zIndex=2;
	realSnow.style.pointerEvents="auto";
	let realSnows=Array(5).fill(realSnow.cloneNode(true));
	realSnows=realSnows.map(function(snow,index){
		let color=realImages[index];
		let r=snow.cloneNode(true);
		r.style.background=color;
		r.style.backgroundSize="cover";
		return r;
	});

	let down=function(div,minMul,maxMul,minTime,maxTime,handlers,styles,element,width,height){
		minTime=minTime?minTime:2;
		maxTime=maxTime?maxTime:11;//9
		minMul=minMul?minMul:20;
		maxMul=maxMul?maxMul:50;
		handlers=handlers?handlers:{};
		styles=styles?styles:{};
		element=element?element.cloneNode(true):virtualSnows[Math.floor(Math.random()*virtualSnows.length)].cloneNode(true);
		width=width?width:1;
		height=height?height:1;
		for (let handler in handlers){
			element[handler]=handlers[handler];
		}
		for(let style in styles){
			element.style[style]=styles[style];
		}
		let mul=Math.random()*(maxMul-minMul)+minMul;
		let divWidth=div.offsetWidth;
		let divHeight=div.offsetHeight;
		element.style.height=height*mul+"px";
		element.style.width=width*mul+"px";
		element.style.top=-maxMul*height+"px";
		let startx=Math.random()*(divWidth+2*maxMul*width)-1*maxMul*width;
		element.style.left=startx+"px";
		let endx,endy;
		endy=divHeight+2*height*mul;
		endx=2*Math.random()*divWidth-divWidth;
		endx=endx/2;
		let time=Math.random()*(maxTime-minTime)+minTime;
		element.style.transition="transform "+time+"s";		
		div.append(element);
		setTimeout(function(){
			element.style.transform=`translate(${endx}px,${endy}px)`;
		},4);
		setTimeout(function(){
			element.remove();
		},time*1000);
	}
	let real=function(div,handlers,minMul,maxMul,minTime,maxTime,styles,element,width,height){
		styles=styles?styles:{};
		styles.pointerEvents="auto";
		styles.cursor="pointer";
		minMul=minMul?minMul:45;
		maxMul=maxMul?maxMul:70;
		element=element?element.cloneNode(true):realSnows[Math.floor(Math.random()*realSnows.length)].cloneNode(true);
		down(div,minMul,maxMul,minTime,maxTime,handlers,styles,element,width,height);
	}
	return {
		down:down,
		real:real
	}
})();