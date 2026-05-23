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
  let outerRadius = 0;
  let innerRadius = 0;
  let armBase = { x: 0, y: 0 };

  // Параметры тонарма
  let currentArmRadius = 0;
  let targetArmRadius = 1;
  let armLifted = false;
  let lastProgress = 0;

  // Изображения для лейблов
  let labelImages = new Map();
  let currentCoverSrc = null;

  // Публичные параметры
  let currentProgress = 0;
  let isPlayingFlag = false;

  // Функция загрузки одного изображения с кэшированием
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      if (labelImages.has(src)) {
        resolve(labelImages.get(src));
        return;
      }
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        labelImages.set(src, img);
        console.log(`✅ Обложка загружена: ${src}`);
        resolve(img);
      };
      img.onerror = (err) => {
        console.error(`❌ Ошибка загрузки обложки: ${src}`, err);
        reject(err);
      };
      img.src = src;
    });
  }

  // Предзагрузка всех обложек из массива
  async function preloadAllCovers(coverList) {
    const promises = coverList
      .filter((src) => src)
      .map((src) => loadImage(src).catch((e) => null));
    await Promise.all(promises);
    if (isActive) resizeAndRedraw();
  }

  function drawVinyl(w, h, time, angle) {
    if (!ctx) return;
    centerX = w / 2;
    centerY = h / 2;
    outerRadius = Math.min(w, h) * 0.42;
    innerRadius = outerRadius * 0.45; // чуть больше для картинки

    armBase.x = w * 0.85;
    armBase.y = h * 0.75;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.translate(-centerX, -centerY);

    // Диск винила
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

    // Дорожки
    const grooves = 12;
    for (let i = 0; i <= grooves; i++) {
      const r = outerRadius * (0.5 + (i * 0.5) / grooves);
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,0,0,${0.2 + i * 0.05})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Центральная наклейка (лейбл)
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#f5e6d3";
    ctx.fill();
    ctx.strokeStyle = "#c0a080";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Рисуем изображение, если оно загружено и соответствует текущему src
    if (currentCoverSrc && labelImages.has(currentCoverSrc)) {
      const img = labelImages.get(currentCoverSrc);
      // Размер картинки чуть больше, чтобы покрыть всю наклейку
      const imgSize = innerRadius * 1.9;
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius - 3, 0, Math.PI * 2);
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
      // Запасной градиент (если картинка ещё не загрузилась)
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
    drawTonarm(w, h, time);
  }

  function drawTonarm(w, h, time) {
    let needleRadius =
      innerRadius + (outerRadius - innerRadius) * currentArmRadius;
    let liftedOffsetY = armLifted ? -15 : 0;

    let dx = centerX + Math.cos(0.5) * needleRadius - armBase.x;
    let dy = centerY + Math.sin(0.5) * needleRadius - 5 - armBase.y;
    let angleArm = Math.atan2(dy, dx);
    let armLength = Math.hypot(dx, dy);

    ctx.save();
    ctx.translate(armBase.x, armBase.y);
    ctx.rotate(angleArm);
    ctx.shadowBlur = 3;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(armLength - 8, -3);
    ctx.lineTo(armLength, 0);
    ctx.lineTo(armLength - 8, 3);
    ctx.fillStyle = "#888";
    ctx.fill();
    ctx.beginPath();
    ctx.rect(armLength - 12, -6, 12, 12);
    ctx.fillStyle = "#ccc";
    ctx.fill();
    ctx.restore();

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
    if (!isPlayingFlag || armLifted) return;
    let diff = targetArmRadius - currentArmRadius;
    currentArmRadius += diff * 0.1;
    if (Math.abs(diff) < 0.001) currentArmRadius = targetArmRadius;
  }

  function setProgress(progress) {
    if (isNaN(progress)) progress = 0;
    progress = Math.min(1, Math.max(0, progress));
    currentProgress = progress;
    targetArmRadius = 1 - progress;
  }

  function setPlaying(playing) {
    isPlayingFlag = playing;
  }

  function setArmLifted(lifted) {
    armLifted = lifted;
    if (!lifted) {
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
      console.warn(`Не удалось загрузить обложку ${src}`);
    }
  }

  // Публичный метод для предзагрузки нескольких обложек
  function preloadCovers(coverArray) {
    preloadAllCovers(coverArray);
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
    preloadCovers,
  };
})();
