var gSnap;
$(function(){
      var myViewModel={
          circleRadius:ko.observable(30),
          cycleLen:ko.observable(5),
          cycle:ko.observable(30),
      };

      var s = Snap("#svg");
      gSnap = s; 

      var cx=200;
      var cy=200;

      var dpi72 = 72 / 25.4; //1.0を72dpiで1mmに変換する係数です
      var updateFunc = function(){
            s.clear();
            var circleRadius = myViewModel.circleRadius() * dpi72;
            var cycle        = myViewModel.cycle();
            var cycleLen     = myViewModel.cycleLen() * dpi72;

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
if(0){
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
}
            var baseR = circleRadius;
            var outCyR  = circleRadius * 0.15;
            var inCyR   = circleRadius * 0.12;
            for(var ii=0;ii < 360; ++ii)
            {
                var t0 = ii / 360;
                var rad = t0 * Math.PI*2;
                var x = (baseR) * Math.cos(rad);
                var y = (baseR) * Math.sin(rad);
                polyLines.push(x+cx);
                polyLines.push(y+cy);
            }
            s.polyline({
                  points:polyLines,
                  fill:"none",
                  stroke: "#0F0",
                  strokeWidth:0.5,
            });

            for(var ii=0;ii < 360; ++ii)
            {
                var t0 = ii / 360;
                var rad = t0 * Math.PI*2;
                var x = (baseR+outCyR) * Math.cos(rad) + outCyR * Math.cos(((baseR+outCyR)/outCyR)*rad);
                var y = (baseR+outCyR) * Math.sin(rad) + outCyR * Math.sin(((baseR+outCyR)/outCyR)*rad);
                polyLines.push(x+cx);
                polyLines.push(y+cy);
            }
            s.polyline({
                  points:polyLines,
                  fill:"none",
                  stroke: "#00F",
                  strokeWidth:0.5,
            });

            for(var ii=0;ii < 360; ++ii)
            {
                var t0 = ii / 360;
                var rad = t0 * Math.PI*2;
                var x = (baseR-inCyR) * Math.cos(rad) - inCyR * Math.cos(((baseR-inCyR)/inCyR)*rad);
                var y = (baseR-inCyR) * Math.sin(rad) - inCyR * Math.sin(((baseR-inCyR)/inCyR)*rad);
                polyLines.push(x+cx);
                polyLines.push(y+cy);
            }
            s.polyline({
                  points:polyLines,
                  fill:"none",
                  stroke: "#F00",
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