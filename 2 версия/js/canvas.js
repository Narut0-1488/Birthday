// canvas.js — рисует реалистичный пион с анимированными лепестками
window.PeonyCanvas = (function() {
    let ctx = null;
    let canvas = null;
    let animationId = null;
    let animTime = 0;
    let isActive = false;
    let currentTheme = 'pinkCoral';
    let rotationAngle = 0;
    let isSpinning = false;

    // Вспомогательная функция — градиент для лепестка
    function getPetalGradient(x, y, radius, angle, color1, color2) {
        const grad = ctx.createLinearGradient(
            x - Math.cos(angle) * radius * 0.3,
            y - Math.sin(angle) * radius * 0.3,
            x + Math.cos(angle) * radius * 0.7,
            y + Math.sin(angle) * radius * 0.7
        );
        grad.addColorStop(0, color1);
        grad.addColorStop(1, color2);
        return grad;
    }

    function drawPeony(width, height, theme, time, angle) {
        if (!ctx) return;
        const w = width, h = height;
        const centerX = w / 2, centerY = h / 2;
        const maxRadius = Math.min(w, h) * 0.42;
        
        ctx.clearRect(0, 0, w, h);
        
        // Сохраняем и поворачиваем (для вращения диска)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.translate(-centerX, -centerY);
        
        // Фон "пластинки" — тёмный круг с текстурой
        const gradDisc = ctx.createRadialGradient(centerX-8, centerY-8, 5, centerX, centerY, maxRadius+12);
        gradDisc.addColorStop(0, '#d48baa');
        gradDisc.addColorStop(1, '#a84d72');
        ctx.fillStyle = gradDisc;
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius+10, 0, Math.PI*2);
        ctx.fill();
        
        // Внешние крупные лепестки (слой 1)
        const outerPetals = 18;
        const angleStep = (Math.PI * 2) / outerPetals;
        const breath = Math.sin(time * 1.5) * 0.03 + Math.cos(time * 0.9) * 0.02;
        
        let colorA, colorB, centerColor;
        if (theme === 'pinkCoral') {
            colorA = '#ff7b8e';
            colorB = '#ffb7c5';
            centerColor = '#ffdd99';
        } else if (theme === 'vibrantPink') {
            colorA = '#ff2d5e';
            colorB = '#ff7a9e';
            centerColor = '#ffe0a3';
        } else {
            colorA = '#e84393';
            colorB = '#ff94c2';
            centerColor = '#ffe0b5';
        }
        
        // Рисуем внешние лепестки
        for (let i = 0; i < outerPetals; i++) {
            const rad = i * angleStep + time * 0.2;
            const scaleFactor = 0.85 + breath * 0.15;
            const petalRadius = maxRadius * (0.75 + Math.sin(rad * 2 + time) * 0.05) * scaleFactor;
            const x1 = centerX + Math.cos(rad) * petalRadius * 0.65;
            const y1 = centerY + Math.sin(rad) * petalRadius * 0.65;
            const x2 = centerX + Math.cos(rad + angleStep * 0.4) * petalRadius;
            const y2 = centerY + Math.sin(rad + angleStep * 0.4) * petalRadius;
            const x3 = centerX + Math.cos(rad - angleStep * 0.4) * petalRadius;
            const y3 = centerY + Math.sin(rad - angleStep * 0.4) * petalRadius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.quadraticCurveTo(x2, y2, x1, y1);
            ctx.quadraticCurveTo(x2, y2, x3, y3);
            ctx.fillStyle = getPetalGradient(centerX, centerY, petalRadius, rad, colorA, colorB);
            ctx.fill();
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
        }
        
        // Средние лепестки (слой 2)
        const midPetals = 16;
        const midStep = (Math.PI * 2) / midPetals;
        for (let i = 0; i < midPetals; i++) {
            const rad = i * midStep + time * 0.3;
            const petalRadius = maxRadius * 0.55;
            const x1 = centerX + Math.cos(rad) * petalRadius * 0.7;
            const y1 = centerY + Math.sin(rad) * petalRadius * 0.7;
            const x2 = centerX + Math.cos(rad + midStep * 0.35) * petalRadius;
            const y2 = centerY + Math.sin(rad + midStep * 0.35) * petalRadius;
            const x3 = centerX + Math.cos(rad - midStep * 0.35) * petalRadius;
            const y3 = centerY + Math.sin(rad - midStep * 0.35) * petalRadius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.quadraticCurveTo(x2, y2, x1, y1);
            ctx.quadraticCurveTo(x2, y2, x3, y3);
            ctx.fillStyle = getPetalGradient(centerX, centerY, petalRadius, rad, colorB, '#ffd0dc');
            ctx.fill();
        }
        
        // Внутренние лепестки (слой 3) — более плотные
        const innerPetals = 14;
        const innerStep = (Math.PI * 2) / innerPetals;
        for (let i = 0; i < innerPetals; i++) {
            const rad = i * innerStep - time * 0.2;
            const petalRadius = maxRadius * 0.38;
            const x1 = centerX + Math.cos(rad) * petalRadius * 0.8;
            const y1 = centerY + Math.sin(rad) * petalRadius * 0.8;
            const x2 = centerX + Math.cos(rad + innerStep * 0.3) * petalRadius;
            const y2 = centerY + Math.sin(rad + innerStep * 0.3) * petalRadius;
            const x3 = centerX + Math.cos(rad - innerStep * 0.3) * petalRadius;
            const y3 = centerY + Math.sin(rad - innerStep * 0.3) * petalRadius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.quadraticCurveTo(x2, y2, x1, y1);
            ctx.quadraticCurveTo(x2, y2, x3, y3);
            ctx.fillStyle = getPetalGradient(centerX, centerY, petalRadius, rad, '#ffb7c5', '#ff90b0');
            ctx.fill();
        }
        
        // Центр цветка (светлое пятно)
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = centerColor;
        ctx.fill();
        
        // Тычинки — жёлтые с мерцанием
        for (let i = 0; i < 80; i++) {
            const rad = Math.random() * Math.PI * 2;
            const dist = maxRadius * (0.22 + Math.random() * 0.12);
            const xx = centerX + Math.cos(rad) * dist;
            const yy = centerY + Math.sin(rad) * dist;
            const flicker = 0.6 + Math.sin(time * 12 + i) * 0.4;
            ctx.beginPath();
            ctx.arc(xx, yy, 2 + Math.sin(time * 10 + i) * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 220, 80, ${flicker})`;
            ctx.fill();
            
            // маленькие "ниточки"
            ctx.beginPath();
            ctx.moveTo(xx, yy);
            ctx.lineTo(xx + Math.cos(rad) * 6, yy + Math.sin(rad) * 6);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = `rgba(255, 200, 60, 0.7)`;
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
        ctx.restore(); // восстановить после поворота
    }

    function animate() {
        if (!isActive || !canvas || !ctx) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = w;
        canvas.height = h;
        animTime += 0.025;
        if (isSpinning) {
            rotationAngle += 0.018;
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

    function startSpin() { isSpinning = true; }
    function stopSpin() { isSpinning = false; }
    function resetRotation() { rotationAngle = 0; }

    function resizeAndRedraw() {
        if (!canvas || !ctx) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = w;
        canvas.height = h;
        if (isActive) drawPeony(w, h, currentTheme, animTime, rotationAngle);
    }

    return {
        start, stop, setTheme, startSpin, stopSpin, resetRotation, resizeAndRedraw
    };
})();