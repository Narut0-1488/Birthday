// canvas.js — рисует живой пион на холсте с возможностью вращения
window.PeonyCanvas = (function() {
    let ctx = null;
    let canvas = null;
    let animationId = null;
    let animTime = 0;
    let isActive = false;
    let currentTheme = 'pinkCoral'; // pinkCoral, vibrantPink, magenta
    let rotationAngle = 0;
    let isSpinning = false;

    // Функция рисования пиона с учётом поворота
    function drawPeony(width, height, theme, time, angle) {
        if (!ctx) return;
        const w = width, h = height;
        const centerX = w/2, centerY = h/2;
        const maxRadius = Math.min(w,h) * 0.4;
        ctx.clearRect(0, 0, w, h);
        
        // Сохраняем контекст и поворачиваем
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.translate(-centerX, -centerY);
        
        // фон пластинки
        const gradBack = ctx.createRadialGradient(centerX-10, centerY-8, 5, centerX, centerY, maxRadius+15);
        gradBack.addColorStop(0, '#f5d6e5');
        gradBack.addColorStop(1, '#e0aac4');
        ctx.fillStyle = gradBack;
        ctx.fillRect(0, 0, w, h);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius+8, 0, Math.PI*2);
        ctx.fillStyle = '#c27090';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius+2, 0, Math.PI*2);
        ctx.fillStyle = '#a84d72';
        ctx.fill();
        
        // лепестки пиона
        const petalCount = 24;
        const angleStep = (Math.PI * 2) / petalCount;
        const wave = Math.sin(time * 3) * 0.03 + Math.cos(time * 1.7) * 0.02;
        
        let mainColor1, mainColor2, centerColor;
        if (theme === 'pinkCoral') {
            mainColor1 = '#ff8da1';
            mainColor2 = '#ffb7c5';
            centerColor = '#ffe0b5';
        } else if (theme === 'vibrantPink') {
            mainColor1 = '#ff2d5e';
            mainColor2 = '#ff7a9e';
            centerColor = '#ffe0b5';
        } else {
            mainColor1 = '#e84393';
            mainColor2 = '#ff94c2';
            centerColor = '#ffe0b5';
        }
        
        for (let i = 0; i < petalCount; i++) {
            const angleRad = i * angleStep + time * 0.5;
            const radVar = maxRadius * (0.45 + 0.1 * Math.sin(angleRad * 3 + time * 2) + wave * 0.08);
            const x1 = centerX + Math.cos(angleRad) * (radVar * 0.65);
            const y1 = centerY + Math.sin(angleRad) * (radVar * 0.65);
            const x2 = centerX + Math.cos(angleRad + angleStep*0.5) * (radVar * 1.1);
            const y2 = centerY + Math.sin(angleRad + angleStep*0.5) * (radVar * 1.1);
            const x3 = centerX + Math.cos(angleRad + angleStep) * (radVar * 0.7);
            const y3 = centerY + Math.sin(angleRad + angleStep) * (radVar * 0.7);
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.quadraticCurveTo(x2, y2, x1, y1);
            ctx.quadraticCurveTo(x2, y2, x3, y3);
            ctx.fillStyle = `rgba(${parseInt(mainColor1.slice(1,3),16)}, ${parseInt(mainColor1.slice(3,5),16)}, ${parseInt(mainColor1.slice(5,7),16)}, 0.9)`;
            ctx.fill();
            
            ctx.beginPath();
            ctx.ellipse(x2, y2, radVar*0.18, radVar*0.12, angleRad, 0, Math.PI*2);
            ctx.fillStyle = mainColor2;
            ctx.fill();
        }
        
        // тычинки
        for (let i=0; i<50; i++) {
            const rad = Math.random() * maxRadius*0.28;
            const ang = Math.random() * Math.PI*2;
            const xx = centerX + Math.cos(ang)*rad;
            const yy = centerY + Math.sin(ang)*rad;
            ctx.beginPath();
            ctx.arc(xx, yy, 2 + Math.sin(time*12 + i)*0.8, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255, 215, 120, ${0.5+Math.sin(time*5+i)*0.3})`;
            ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius*0.22, 0, Math.PI*2);
        ctx.fillStyle = centerColor;
        ctx.fill();
        
        ctx.restore(); // восстановить трансформацию
    }

    function animate() {
        if (!isActive || !canvas || !ctx) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = w;
        canvas.height = h;
        animTime += 0.025;
        if (isSpinning) {
            rotationAngle += 0.02;
        }
        drawPeony(w, h, currentTheme, animTime, rotationAngle);
        animationId = requestAnimationFrame(animate);
    }

    function start(canvasElement, theme = 'pinkCoral') {
        if (!canvasElement) return;
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        currentTheme = theme;
        isActive = true;
        animTime = 0;
        rotationAngle = 0;
        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(animate);
    }

    function stop() {
        isActive = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function setTheme(theme) {
        currentTheme = theme;
    }

    function startSpin() {
        isSpinning = true;
    }

    function stopSpin() {
        isSpinning = false;
    }

    function resetRotation() {
        rotationAngle = 0;
    }

    function resizeAndRedraw() {
        if (!canvas || !ctx) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = w;
        canvas.height = h;
        if (isActive) {
            drawPeony(w, h, currentTheme, animTime, rotationAngle);
        }
    }

    return {
        start: start,
        stop: stop,
        setTheme: setTheme,
        startSpin: startSpin,
        stopSpin: stopSpin,
        resetRotation: resetRotation,
        resizeAndRedraw: resizeAndRedraw
    };
})();