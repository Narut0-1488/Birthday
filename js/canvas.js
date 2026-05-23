window.PeonyCanvas = (function () {
  let ctx = null;
  let canvas = null;
  let animationId = null;
  let animTime = 0;
  let isActive = false;
  let rotationAngle = 0;
  let isSpinning = false;
  let skipRotation = false;

  // Параметры винила
  let centerX = 0,
    centerY = 0;
  let outerRadius = 0; // внешний радиус дорожек
  let innerRadius = 0; // радиус центральной наклейки
  let armBase = { x: 0, y: 0 };

  // Параметры тонарма
  let currentArmRadius = 0; // радиус от центра до иглы (0..1, где 1 = outer, 0 = inner)
  let targetArmRadius = 1; // целевое значение для плавного движения
  let armLifted = false; // поднят ли тонарм
  let armLiftProgress = 0; // 0=опущен, 1=поднят (анимация)
  let lastProgress = 0; // запоминаем последний прогресс трека

  // Для вибрации иглы
  let vibrationOffset = { x: 0, y: 0 };

  // Изображения для лейблов
  let labelImages = new Map(); // ключ: URL, значение: HTMLImageElement
  let currentCoverSrc = null;

  // Публичные параметры (устанавливаются из main.js)
  let currentProgress = 0; // 0..1, положение иглы
  let isPlayingFlag = false;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      if (labelImages.has(src)) {
        resolve(labelImages.get(src));
        return;
      }
      const img = new Image();
      img.crossOrigin = "Anonymous"; // если нужно
      img.onload = () => {
        labelImages.set(src, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Cannot load image ${src}`));
      img.src = src;
    });
  }

  function drawVinyl(w, h, time, angle) {
    if (!ctx) return;
    centerX = w / 2;
    centerY = h / 2;
    outerRadius = Math.min(w, h) * 0.42;
    innerRadius = outerRadius * 0.35; // радиус центральной наклейки

    // Основание тонарма (справа внизу)
    armBase.x = w * 0.85;
    armBase.y = h * 0.75;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.translate(-centerX, -centerY);

    // 1. Диск винила
    const gradVinyl = ctx.createLinearGradient(
      centerX - outerRadius * 0.2,
      centerY - outerRadius * 0.2,
      centerX + outerRadius * 0.2,
      centerY + outerRadius * 0.2,
    );
    gradVinyl.addColorStop(0, "#1a1a1a");
    gradVinyl.addColorStop(1, "#2c2c2c");
    ctx.fillStyle = gradVinyl;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Блик
    ctx.beginPath();
    ctx.arc(
      centerX - outerRadius * 0.15,
      centerY - outerRadius * 0.15,
      outerRadius * 0.2,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();

    // Концентрические дорожки
    const grooves = 12;
    for (let i = 0; i <= grooves; i++) {
      const r = outerRadius * (0.5 + (i * 0.5) / grooves);
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,0,0,${0.2 + i * 0.05})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 2. Центральная наклейка (лейбл)
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#f5e6d3";
    ctx.fill();
    ctx.strokeStyle = "#c0a080";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Рисуем изображение, если загружено
    if (currentCoverSrc && labelImages.has(currentCoverSrc)) {
      const img = labelImages.get(currentCoverSrc);
      const imgSize = innerRadius * 1.8;
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius - 4, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        img,
        centerX - imgSize / 2,
        centerY - imgSize / 2,
        imgSize,
        imgSize,
      );
      ctx.restore();
    } else {
      // Запасной градиент
      const gradLabel = ctx.createRadialGradient(
        centerX - 8,
        centerY - 8,
        5,
        centerX,
        centerY,
        innerRadius,
      );
      gradLabel.addColorStop(0, "#ffb7c5");
      gradLabel.addColorStop(1, "#d48baa");
      ctx.fillStyle = gradLabel;
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius - 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // сброс вращения

    // 3. Тонарм (рисуется без вращения)
    drawTonarm(w, h, time);
  }

  function drawTonarm(w, h, time) {
    // Вычисляем текущий радиус иглы (от центра) в пикселях
    let needleRadius =
      innerRadius + (outerRadius - innerRadius) * currentArmRadius;
    // Если тонарм поднят – игла не касается пластинки, поднимаем вверх (уменьшаем радиус визуально или просто рисуем выше)
    let liftedOffsetY = armLifted ? -15 : 0;

    // Угол от базы до точки иглы (в радианах)
    let dx = centerX + Math.cos(0.5) * needleRadius - armBase.x; // игла чуть правее центра для реализма
    let dy = centerY + Math.sin(0.5) * needleRadius - 5 - armBase.y;
    let angleArm = Math.atan2(dy, dx);
    let armLength = Math.hypot(dx, dy);

    // Рисуем тонарм (рука)
    ctx.save();
    ctx.translate(armBase.x, armBase.y);
    ctx.rotate(angleArm);
    // Тень
    ctx.shadowBlur = 3;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(armLength - 8, -3);
    ctx.lineTo(armLength, 0);
    ctx.lineTo(armLength - 8, 3);
    ctx.fillStyle = "#888";
    ctx.fill();
    // Головка
    ctx.beginPath();
    ctx.rect(armLength - 12, -6, 12, 12);
    ctx.fillStyle = "#ccc";
    ctx.fill();
    ctx.restore();

    // Игла (маленький кружок) с вибрацией
    let vibrX = 0,
      vibrY = 0;
    if (isPlayingFlag && !armLifted) {
      vibrX = Math.sin(time * 50) * 1.2 + Math.sin(time * 37) * 0.8;
      vibrY = Math.cos(time * 53) * 0.8;
    }
    const needleX = centerX + Math.cos(0.5) * needleRadius + vibrX;
    const needleY =
      centerY + Math.sin(0.5) * needleRadius - 5 + vibrY + liftedOffsetY;
    ctx.beginPath();
    ctx.arc(needleX, needleY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffaa66";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(needleX, needleY, 1, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function updateArmPosition() {
    if (!isPlayingFlag || armLifted) {
      // Не двигаем иглу при паузе или поднятии
      return;
    }
    // Плавно двигаем currentArmRadius к targetArmRadius (который вычисляется из progress)
    let diff = targetArmRadius - currentArmRadius;
    currentArmRadius += diff * 0.1;
    if (Math.abs(diff) < 0.001) currentArmRadius = targetArmRadius;
  }

  // Вызывается из main.js для обновления прогресса трека
  function setProgress(progress) {
    if (isNaN(progress)) progress = 0;
    progress = Math.min(1, Math.max(0, progress));
    currentProgress = progress;
    // targetArmRadius: 1 = внешний край, 0 = внутренний край (касание картинки)
    targetArmRadius = 1 - progress; // при progress=0 => внешний, progress=1 => внутренний
    if (!isPlayingFlag || armLifted) {
      // Если на паузе – не двигаем, но запоминаем целевое
    }
  }

  function setPlaying(playing) {
    isPlayingFlag = playing;
    if (!playing) {
      // Останавливаем вибрацию (она и так по флагу)
    }
  }

  function setArmLifted(lifted) {
    armLifted = lifted;
    if (!lifted) {
      // Когда опускаем, сразу подтягиваем currentArmRadius к целевому
      currentArmRadius = targetArmRadius;
    }
  }

  async function setCoverImage(src) {
    if (!src) return;
    currentCoverSrc = src;
    try {
      await loadImage(src);
      if (isActive) resizeAndRedraw();
    } catch (e) {
      console.warn("Cover not loaded", e);
    }
  }

  function animate() {
    if (!isActive || !canvas || !ctx) return;
    if (document.hidden) {
      animationId = requestAnimationFrame(animate);
      return;
    }
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;
    animTime += 0.025;

    let currentRotation = rotationAngle;
    if (!skipRotation && isSpinning) {
      currentRotation += 0.018;
      rotationAngle = currentRotation;
    }

    // Обновляем позицию тонарма (плавное движение)
    updateArmPosition();

    drawVinyl(w, h, animTime, currentRotation);
    animationId = requestAnimationFrame(animate);
  }

  function start(canvasElement, coverSrc = null) {
    if (!canvasElement) return;
    canvas = canvasElement;
    ctx = canvas.getContext("2d");
    isActive = true;
    animTime = 0;
    rotationAngle = 0;
    skipRotation = false;
    isPlayingFlag = false;
    armLifted = false;
    currentArmRadius = 1;
    targetArmRadius = 1;
    currentProgress = 0;
    if (coverSrc) setCoverImage(coverSrc);
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

  function startSpin() {
    isSpinning = true;
  }
  function stopSpin() {
    isSpinning = false;
  }
  function resetRotation() {
    rotationAngle = 0;
  }
  function setSkipRotation(flag) {
    skipRotation = flag;
  }

  function resizeAndRedraw() {
    if (!canvas || !ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;
    if (isActive) drawVinyl(w, h, animTime, rotationAngle);
  }

  return {
    start,
    stop,
    startSpin,
    stopSpin,
    resetRotation,
    resizeAndRedraw,
    setSkipRotation,
    setProgress,
    setPlaying,
    setArmLifted,
    setCoverImage,
  };
})();
