(() => {
    for (const ele of document.querySelectorAll(".loading")) { ele.remove(); }
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    const points = [];
    const last_valid_points = [];

    function startDrawing(e) {
        e.preventDefault();
        points.length = 0;
        isDrawing = true;
        draw(e);
    }

    function clearDrawing() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!points.length) {
            ctx.font = `20px Arial`;
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("Draw a circle", window.innerWidth / 2, 60);
            ctx.font = `10px Arial`;
            ctx.fillText("Help: https://joat917.github.io/DrawCircle/help.html", window.innerWidth / 2, 80);
        }
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function reDraw() {
        clearDrawing();
        if (points.length <= 1) return;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#03c';
        ctx.beginPath();
        ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
        for (const point of points) {
            ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
        ctx.beginPath();
    }

    function putInfo(info) {
        ctx.font = `20px Arial`;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        let score = Math.max(55 - 25 * Math.log10(info.deviation / info.radius + 0.0063), 0);
        ctx.fillText(`direction:  ${info.winding > 0 ? 'clockwise' : 'counterclockwise'}`, 20, window.innerHeight - 120);
        ctx.fillText(`score:  ${score.toFixed(1)}/100 (GPA:${(score >= 60 ? 4 - 0.001875 * (100 - score) ** 2 : 0).toFixed(2)}/4.00)`, 20, window.innerHeight - 100);
        ctx.font = `14px Arial`;
        ctx.fillText(`radius:  ${info.radius.toFixed(1)}px`, 25, window.innerHeight - 83);
        ctx.fillText(`deviation:  ${info.deviation.toFixed(1)}px`, 25, window.innerHeight - 69);
        ctx.fillText(`roughness:  ${(info.roughIndex*100).toFixed(2)}%`, 25, window.innerHeight - 55);
        ctx.fillText(`developer:  Joat917@github`, 25, window.innerHeight - 41);

        // draw spectrum
        const left=Math.max(Math.min(300, window.innerWidth-210), 10);
        const right=window.innerWidth-20;
        const top=window.innerHeight-90;
        const bottom=window.innerHeight-10;
        let maxspec=0;
        for (let i=1;i<=36;i++){
            maxspec=Math.max(maxspec, info.spectrum[i]);
        }
        if(maxspec===0){
            return;
        }
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.fillStyle = '#f00';
        ctx.strokeStyle = '#F00';
        ctx.fillText("Spectrum:", Math.max(left-70, 10), bottom);
        ctx.beginPath();
        ctx.moveTo(left, bottom)
        for (let i=1;i<=36;i++){
            ctx.lineTo(i/36*(right-left)+left, bottom-(bottom-top)*info.spectrum[i]/maxspec);
        }
        ctx.stroke();
        ctx.beginPath();
        for (let i=1;i<=36;i++){
            if(i>=10&&(i%3!=0)){continue;}
            ctx.fillText(i, i/36*(right-left)+left, bottom-(bottom-top)*info.spectrum[i]/maxspec);
        }
    }

    function stopDrawing() {
        isDrawing = false;
        ctx.beginPath();
        calculateInfo();
    }

    function draw(e) {
        if (!isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;
        if (e.type === 'mousemove') {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        } else if (e.type === 'touchmove') {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        }
        if (!(isFinite(x) && isFinite(y))) return;

        points.push({ x, y });

        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#03c';

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function drawCenter(x, y, radius) {
        if (isDrawing) return;
        if (!isFinite(x + y)) return;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#f00';

        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.stroke();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        for (let angle = 0; angle <= Math.PI * 2; angle += 0.02) {
            ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
        }
        ctx.lineTo(x + radius, y);
        ctx.stroke();
        ctx.beginPath();
    }

    function drawArrow(x, y, direction) {
        if (isDrawing) return;
        if (!isFinite(x + y + direction)) return;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#f00';

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 30 * Math.cos(direction), y + 30 * Math.sin(direction));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 30 * Math.cos(direction) - 5 * Math.cos(direction + 0.7), y + 30 * Math.sin(direction) - 5 * Math.sin(direction + 0.7));
        ctx.lineTo(x + 30 * Math.cos(direction), y + 30 * Math.sin(direction));
        ctx.lineTo(x + 30 * Math.cos(direction) - 5 * Math.cos(direction - 0.7), y + 30 * Math.sin(direction) - 5 * Math.sin(direction - 0.7));
        ctx.stroke();
        ctx.beginPath();
    }

    // 数值计算
    function distance(pt1, pt2) {
        return Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2);
    }

    function sum(arr) {
        o = 0;
        for (const v of arr) {
            o += v;
        }
        return o;
    }

    function mod(a, b) {
        console.assert(b > 0);
        if (a >= 0) {
            return a % b;
        } else {
            return (b - (-a) % b) % b;
        }
    }

    function isClose(a, b) {
        return Math.abs(a - b) < 1e-7;
    }

    function ptmean(ptList, powerList) {
        let powersum = 0;
        let ptsum = [0, 0];
        for (let i = 0; i < ptList.length; i++) {
            console.assert(isFinite(ptsum[0]));
            powersum += powerList[i];
            ptsum[0] += powerList[i] * ptList[i].x;
            ptsum[1] += powerList[i] * ptList[i].y;
        }
        return { x: ptsum[0] / powersum, y: ptsum[1] / powersum, powersum: powersum };
    }

    function phase(x, y){
        if (y === 0) {
            if (x >= 0) {
                return 0;
            } else{
                return Math.PI;
            }
        }
        if (y > 0) {
            return Math.PI / 2 - Math.atan(x/y);
        } else {
            return - Math.PI / 2 - Math.atan(x/y);
        }
    }

    function toPolarCoord(xyCoord, center) {
        //(theta, r)
        return [phase(xyCoord.x - center.x, xyCoord.y - center.y), distance(xyCoord, center)];
    }

    function pointCompensate(threshold=2){
        const newPoints=[];
        for(let i=0;i<points.length;i++){
            newPoints.push(points[i]);
            const j=mod(i+1, points.length);
            const dist=distance(points[i], points[j]);
            if (dist>threshold){
                const segCount=Math.ceil(dist/threshold);
                const k={
                    x:(points[j].x-points[i].x)/segCount,
                    y:(points[j].y-points[i].y)/segCount
                }
                for(let _i=1;_i<segCount;_i++){
                    newPoints.push({
                        x:k.x*_i+points[i].x,
                        y:k.y*_i+points[i].y,
                    })
                }
            }
        }
        points.splice(0);
        newPoints.forEach(v=>points.push(v));
    }

    function calculateInfo(force_reload=false) {
        // 通过积分的方式找到图形中央
        if (points.length < 5) {
            points.splice(0);
            last_valid_points.forEach(v => points.push(v));
            if (points.length < 5) {
                clearDrawing();
                return;
            }else{
                return calculateInfo(force_reload=true);
            }
        }

        pointCompensate();

        const center_temp = (() => {
            const intervals = [];
            for (let i = 0; i < points.length - 1; i++) {
                intervals.push(distance(points[i + 1], points[i]));
            }
            intervals.push(distance(points[0], points[points.length - 1]));
            const powers = [(intervals[0] + intervals[intervals.length - 1]) / 2];
            for (let i = 0; i < points.length - 1; i++) {
                powers[i + 1] = (intervals[i] + intervals[i + 1]) / 2;
            }
            return ptmean(points, powers);
        }
        )();

        function fix(x) {
                if (x < -4) { return x + 2 * Math.PI }
                if (x > 4) { return x - 2 * Math.PI }
                return x
            }

        function integralLite(center) {
            const thetaRList = [];
            for (let i = 0; i < points.length; i++) {
                thetaRList.push(toPolarCoord(points[i], center));
            }
            let rList = [];
            let rPow = [];
            for (let i = 0; i < points.length; i++) {
                rList.push(thetaRList[i][1])
                rPow.push(fix(thetaRList[mod((i + 1), points.length)][0] - thetaRList[mod((i - 1), points.length)][0]) / Math.PI / 4);
            }

            // winding number check
            const winding_number = (() => {
                const winding_number_approx = sum(rPow);
                if (isClose(winding_number_approx, Math.round(winding_number_approx))) {
                    return Math.round(winding_number_approx);
                } else if (isClose(winding_number_approx, Math.round(winding_number_approx * 2) / 2)) {
                    return Math.round(winding_number_approx * 2) / 2;
                } else {
                    return winding_number_approx;
                }
            })();

            if (Math.abs(winding_number) !== 1) {
                return {
                    winding: winding_number,
                    acceptable: false,
                    cosfit: NaN,
                    sinfit: NaN
                }
            }

            const rPowSum = sum(rPow.map(Math.abs));
            const dThetaList=rPow.map(v=>Math.abs(v)/rPowSum);

            // radius
            let r = 0;
            for (let i = 0; i < points.length; i++) {
                r += rList[i] *dThetaList[i];
            }

            // minimize square error
            let cosfit = 0;
            let sinfit = 0;
            for (let i = 0; i < points.length; i++) {
                cosfit += (rList[i]-r) * dThetaList[i] * Math.cos(thetaRList[i][0]);
                sinfit += (rList[i]-r) * dThetaList[i] * Math.sin(thetaRList[i][0]);
            }

            return {
                winding: winding_number,
                acceptable: true, 
                cosfit: cosfit,
                sinfit: sinfit
            };
        }

        function integral(center) {
            const thetaRList = [];
            for (let i = 0; i < points.length; i++) {
                thetaRList.push(toPolarCoord(points[i], center));
            }
            let rList = [];
            let rPow = [];
            for (let i = 0; i < points.length; i++) {
                rList.push(thetaRList[i][1])
                rPow.push(fix(thetaRList[mod((i + 1), points.length)][0] - thetaRList[mod((i - 1), points.length)][0]) / Math.PI / 4);
            }

            // winding number check
            const winding_number = (() => {
                const winding_number_approx = sum(rPow);
                if (isClose(winding_number_approx, Math.round(winding_number_approx))) {
                    return Math.round(winding_number_approx);
                } else if (isClose(winding_number_approx, Math.round(winding_number_approx * 2) / 2)) {
                    return Math.round(winding_number_approx * 2) / 2;
                } else {
                    return winding_number_approx;
                }
            })();

            if (Math.abs(winding_number) !== 1) {
                return {
                    winding: winding_number,
                    radius: NaN,
                    deviation: NaN, 
                    strechDirection: NaN
                }
            }

            const rPowSum = sum(rPow.map(Math.abs));
            const dThetaList=rPow.map(v=>Math.abs(v)/rPowSum);

            let r = 0;
            for (let i = 0; i < points.length; i++) {
                r += rList[i] *dThetaList[i];
            }

            let se = 0;
            for (let i = 0; i < points.length; i++) {
                se += (rList[i] - r) ** 2 * Math.abs(rPow[i]); // punish the behavior of sweeping back and forth
            }

            let sefixed=se/ rPowSum;

            let spectrum={};
            let theta0doubled=NaN;
            const _freq_start=0;
            const _freq_end=360;
            for(let freq=_freq_start;freq<=_freq_end;freq++){
                let cosfit=0, sinfit=0;
                for(let i=0;i<points.length;i++){
                    cosfit += (rList[i]-r) * dThetaList[i] * Math.cos(freq*thetaRList[i][0]);
                    sinfit += (rList[i]-r) * dThetaList[i] * Math.sin(freq*thetaRList[i][0]);
                }
                spectrum[freq]=(freq===0?1:2)*Math.sqrt(cosfit**2+sinfit**2);
                if(freq===2){
                    theta0doubled=phase(cosfit, sinfit);
                }
            };
            (()=>{
                let inffit=sefixed;
                for(let i=1;i<=_freq_end;i<<=1){
                    inffit-=spectrum[i]**2/Math.PI;
                }
                if(inffit>0){
                    spectrum[Infinity]=Math.sqrt(inffit);
                }else{
                    spectrum[Infinity]=0;
                }
            })();

            return {
                winding: winding_number,
                radius: r,
                deviation: Math.sqrt(se),
                spectrum:spectrum,
                strechDirection: theta0doubled / 2, 
                roughIndex: spectrum[Infinity]/sefixed
            };
        }

        const info_temp = integralLite(center_temp);
        if (!info_temp.acceptable) {
            points.splice(0);
            last_valid_points.forEach(v => points.push(v));
            return calculateInfo(force_reload=true);
        } else {
            if(!force_reload&&last_valid_points.length==points.length){
                let flag=0;
                for(let _i=0;_i<points.length;_i++){
                    if(!(isClose(last_valid_points[_i].x, points[_i].x)&&isClose(last_valid_points[_i].y, points[_i].y))){
                        flag=1;
                        break;
                    }
                }
                if(flag===0){
                    return;
                }
            }
            last_valid_points.splice(0);
            points.forEach(v => last_valid_points.push(v));
        }

        reDraw();

        // to fit the center... but it seems unnecessary
        const center = ((center) => {
            if (!info_temp.acceptable) {
                return { x: NaN, y: NaN }
            }
            for (let i = 0; i < 100; i++) {
                let info = integralLite(center);
                if (isClose(info.cosfit, 0) && isClose(info.sinfit, 0)) {
                    return center;
                }
                center = {
                    x: center.x + info.cosfit,
                    y: center.y + info.sinfit
                };
                if (!(isFinite(center.x) && isFinite(center.y))) {
                    return center_temp;
                }
            }
            return center;
        })(center_temp);

        const info = integral(center);
        drawCenter(center.x, center.y, info.radius);
        drawArrow(center.x, center.y, info.strechDirection);
        drawArrow(center.x, center.y, info.strechDirection + Math.PI);

        putInfo(info);
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    resizeCanvas();
    clearDrawing();
})();