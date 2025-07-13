(() => {
    // 绘制曲线并在控制台打印坐标
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
        ctx.font = `10px Arial`;
        ctx.fillText(`radius:  ${info.radius.toFixed(1)}px`, 25, window.innerHeight - 85);
        ctx.fillText(`deviation:  ${info.deviation.toFixed(1)}px`, 25, window.innerHeight - 75);
        ctx.fillText(`dipoleErr:  ${info.bipole.toFixed(1)}px`, 25, window.innerHeight - 65);
        ctx.fillText(`developer:  Joat917@github`, 25, window.innerHeight - 55);
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

    function toPolarCoord(xyCoord, center) {
        //(theta, r)
        const dist = distance(xyCoord, center);
        if (xyCoord.y === center.y) {
            if (xyCoord.x > center.x) {
                return [0, dist];
            } else if (xyCoord.x < center.x) {
                return [Math.PI, dist];
            } else {
                return [NaN, 0];
            }
        }
        if (xyCoord.y > center.y) {
            return [Math.PI / 2 - Math.atan((xyCoord.x - center.x) / (xyCoord.y - center.y)), dist];
        } else {
            return [-Math.PI / 2 - Math.atan((xyCoord.x - center.x) / (xyCoord.y - center.y)), dist];
        }
    }

    function calculateInfo() {
        // 通过积分的方式找到图形中央
        if (points.length < 5) {
            points.splice(0);
            last_valid_points.forEach(v => points.push(v));
            if (points.length < 5) {
                clearDrawing();
                return;
            }
        }
        const intervals = [];
        for (let i = 0; i < points.length - 1; i++) {
            intervals.push(distance(points[i + 1], points[i]));
        }
        intervals.push(distance(points[0], points[points.length - 1]));
        const powers = [(intervals[0] + intervals[intervals.length - 1]) / 2];
        for (let i = 0; i < points.length - 1; i++) {
            powers[i + 1] = (intervals[i] + intervals[i + 1]) / 2;
        }

        function integral(center) {
            function fix(x) {
                if (x < -4) { return x + 2 * Math.PI }
                if (x > 4) { return x - 2 * Math.PI }
                return x
            }
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
                    deviation: NaN
                }
            }

            const rPowSum = sum(rPow.map(Math.abs));

            let r = 0;
            for (let i = 0; i < points.length; i++) {
                r += rList[i] * Math.abs(rPow[i]) / rPowSum;
            }

            let se = 0;
            for (let i = 0; i < points.length; i++) {
                se += (rList[i] - r) ** 2 * Math.abs(rPow[i]); // punish the behavior of sweeping back and forth
            }

            let cosfit = 0;
            let sinfit = 0;
            let cos2fit = 0;
            let sin2fit = 0;
            for (let i = 0; i < points.length; i++) {
                cosfit += rList[i] * Math.abs(rPow[i]) / rPowSum * Math.cos(thetaRList[i][0]);
                sinfit += rList[i] * Math.abs(rPow[i]) / rPowSum * Math.sin(thetaRList[i][0]);
                cos2fit += (rList[i] - r) * Math.abs(rPow[i]) / rPowSum * Math.cos(2 * thetaRList[i][0]);
                sin2fit += (rList[i] - r) * Math.abs(rPow[i]) / rPowSum * Math.sin(2 * thetaRList[i][0]);
            }
            let [theta0doubled, bipolePied] = toPolarCoord({ x: cos2fit, y: sin2fit }, { x: 0, y: 0 });

            return {
                winding: winding_number,
                radius: r,
                deviation: Math.sqrt(se),
                cosfit: cosfit,
                sinfit: sinfit,
                strechDirection: theta0doubled / 2,
                bipole: bipolePied
            };
        }

        const center_temp = ptmean(points, powers);

        const info_temp = integral(center_temp);
        if (!isFinite(info_temp.radius)) {
            points.splice(0);
            last_valid_points.forEach(v => points.push(v));
            return calculateInfo();
        } else {
            last_valid_points.splice(0);
            points.forEach(v => last_valid_points.push(v));
        }

        reDraw();

        // to fit the center... but it seems unnecessary
        const center = ((center) => {
            if (!isFinite(info_temp.radius)) {
                return { x: NaN, y: NaN }
            }
            for (let i = 0; i < 100; i++) {
                let info = integral(center);
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