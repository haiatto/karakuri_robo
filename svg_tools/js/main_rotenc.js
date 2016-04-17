var gSnap;
$(function(){
      var myViewModel={
          circleRadius:ko.observable(30),
          cycleLen:ko.observable(5),
          cycle:ko.observable(90),
      };

      var s = Snap("#svg");
      gSnap = s; 

      var cx=200;
      var cy=200;

      var drawMoveLine = function(info)
      {
        var minDeg=99999, maxDeg=0;
        for(var cycIdx=0; cycIdx < info.cycle; cycIdx++)
        {
          var startRad    = (cycIdx / info.cycle) * Math.PI*2;
          var lenRad      = (1 / info.cycle)      * Math.PI*2;
          var startRadius = info.startR;
          var lenRadius   = info.endR - info.startR;
          var nowRad,nowRadius;
          //外側
          var polyLines=[];
          for(var smpIdx=0;smpIdx <= info.samplingOneCycle; ++smpIdx)
          {
            var t = smpIdx / info.samplingOneCycle;
            if(t<0.5){
                nowRad   = startRad    + t * lenRad;
                nowRadius= startRadius + t*2 * lenRadius;   
            }else{
                nowRad   = startRad    + t * lenRad;
                nowRadius= startRadius + lenRadius - (t-0.5)*2 * lenRadius;   
            }
            var x = nowRadius*Math.cos(nowRad) - Math.sin(nowRad);
            var y = nowRadius*Math.sin(nowRad) + Math.cos(nowRad);
            polyLines.push(x+cx);
            polyLines.push(y+cy);
          }
          //内側
          var polyLines2=[];
          for(var smpIdx=0;smpIdx <= info.samplingOneCycle; ++smpIdx)
          {
            var x = polyLines[smpIdx*2];
            var y = polyLines[smpIdx*2+1];
            var vx = x - cx;
            var vy = y - cy;
            var vLen = Math.sqrt(vx*vx+vy*vy);
            if(vLen!=0){
                var nx = vx/vLen;
                var ny = vy/vLen;
                var newLen = vLen - info.innerLen;
                polyLines2.push(nx * newLen + cx);
                polyLines2.push(ny * newLen + cy);
            }
          }
          for(var smpIdx=1;smpIdx <= info.samplingOneCycle-1; ++smpIdx)
          {
            var x0 = polyLines[(smpIdx-1)*2];
            var y0 = polyLines[(smpIdx-1)*2+1];
            var x1 = polyLines[smpIdx*2];
            var y1 = polyLines[smpIdx*2+1];
            var x2 = polyLines[(smpIdx+1)*2];
            var y2 = polyLines[(smpIdx+1)*2+1];
            var dx = x2-x0;
            var dy = y2-y0;
            var dLen = Math.sqrt(dx*dx+dy*dy);
            if(dLen!=0){
                //polyLines2.push(x1+(-dy/dLen)*info.innerLen);
                //polyLines2.push(y1+( dx/dLen)*info.innerLen);
            }
          }
          s.polyline({
              points:polyLines,
              fill:"none",
              stroke:"red",
              strokeWidth:1,
          });
        }
        info.aturyokukakuMin = minDeg;
        info.aturyokukakuMax = maxDeg;
        console.log("max:"+maxDeg+"min:"+minDeg);
      };
      var dpi72 = 72 / 25.4; //1.0を72dpiで1mmに変換する係数です
      var updateFunc = function(){
            s.clear();
            var circleRadius = myViewModel.circleRadius() * dpi72;
            var cycle        = myViewModel.cycle();
            var cycleLen     = myViewModel.cycleLen() * dpi72;
            // 外円
            /*
            var mainCircle = s.circle(cx,cy, circleRadius);
            mainCircle.attr({
                fill: "none",
                stroke: "#00F",
                strokeWidth: 1
            });
            */
            // 六角シャフト穴
            var rp = s.rpolygon(6,cx,cy,1.5*dpi72).attr({fill:"red"});
            rp.attr({
                fill: "none",
                stroke: "#F00",
                strokeWidth: 1
            });
            //s.prependTo(container);

            // 歯
            var polyLines=[];
            for(var ii=0;ii < cycle; ++ii)
            {
                var t0 = ii / cycle;
                var t1 = (ii+1) / cycle;
                var rad0 = t0 * Math.PI * 2;
                var radM = ((t1-t0)/2+t0) * Math.PI * 2;
                var rad1 = t1 * Math.PI * 2;
                var x = circleRadius*Math.cos(rad0) - Math.sin(rad0);
                var y = circleRadius*Math.sin(rad0) + Math.cos(rad0);
                polyLines.push(x+cx);
                polyLines.push(y+cy);
                x = circleRadius*Math.cos(radM) - Math.sin(radM);
                y = circleRadius*Math.sin(radM) + Math.cos(radM);
                polyLines.push(x+cx);
                polyLines.push(y+cy);
                x = (circleRadius-cycleLen)*Math.cos(radM) - Math.sin(radM);
                y = (circleRadius-cycleLen)*Math.sin(radM) + Math.cos(radM);
                polyLines.push(x+cx);
                polyLines.push(y+cy);
                x = (circleRadius-cycleLen)*Math.cos(rad1) - Math.sin(rad1);
                y = (circleRadius-cycleLen)*Math.sin(rad1) + Math.cos(rad1);
                polyLines.push(x+cx);
                polyLines.push(y+cy);
                x = (circleRadius)*Math.cos(rad1) - Math.sin(rad1);
                y = (circleRadius)*Math.sin(rad1) + Math.cos(rad1);
                polyLines.push(x+cx);
                polyLines.push(y+cy);
            }
            s.polyline({
                  points:polyLines,
                  fill:"none",
                  stroke: "#00F",
                  strokeWidth:0.5,
            });

            var svgTxt = $("#svgContent").html();
            svgTxt = svgTxt.replace( /<svg /g , '<svg xmlns="http://www.w3.org/2000/svg" ' ) ;
            svgTxt = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' + svgTxt;
            $("#svgText").text(svgTxt);
            console.log(svgTxt);
      };
      ko.bindingHandlers.updateDraw = {
          init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
              //updateFunc();
              element =element;
          },
          update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
              updateFunc();
          }
      };
      updateFunc();
      ko.applyBindings(myViewModel);

});