(() => {
    // =========================================================================
    // 1. THREE.JS 3D NEURAL CONSTELLATION & DATA-WAVE MOTION GRAPHIC ENGINE
    // =========================================================================
    const canvas = document.getElementById("bg-3d-canvas");
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050811, 0.028);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, 0.6, 15);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Generate soft circular glow sprite texture so particles render as luminous orbs
    function createGlowTexture() {
        const spriteCanvas = document.createElement("canvas");
        spriteCanvas.width = 64;
        spriteCanvas.height = 64;
        const ctx = spriteCanvas.getContext("2d");
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.28, "rgba(180, 245, 255, 0.85)");
        grad.addColorStop(0.65, "rgba(56, 189, 248, 0.22)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(spriteCanvas);
    }
    const glowTexture = createGlowTexture();

    // -------------------------------------------------------------------------
    // LAYER A: Undulating 3D Perspective Data-Wave Floor
    // -------------------------------------------------------------------------
    const waveWidth = 64;
    const waveDepth = 42;
    const waveSegX = 48;
    const waveSegZ = 32;
    const waveGeo = new THREE.PlaneGeometry(waveWidth, waveDepth, waveSegX, waveSegZ);
    waveGeo.rotateX(-Math.PI / 2);

    const waveMat = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        wireframe: true,
        transparent: true,
        opacity: 0.15
    });
    const waveMesh = new THREE.Mesh(waveGeo, waveMat);
    waveMesh.position.set(0, -6.2, -6);
    scene.add(waveMesh);
    const waveBasePositions = Float32Array.from(waveGeo.attributes.position.array);

    // -------------------------------------------------------------------------
    // LAYER B: Peripheral 3D Gyroscopic Astrolabe Rings (Framing the Stage)
    // -------------------------------------------------------------------------
    const astrolabeGroup = new THREE.Group();
    scene.add(astrolabeGroup);

    const outerRing1 = new THREE.Mesh(
        new THREE.TorusGeometry(6.9, 0.025, 16, 140),
        new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.28 })
    );
    outerRing1.rotation.x = Math.PI / 2.7;
    astrolabeGroup.add(outerRing1);

    const outerRing2 = new THREE.Mesh(
        new THREE.TorusGeometry(8.1, 0.02, 16, 140),
        new THREE.MeshBasicMaterial({ color: 0xf72585, transparent: true, opacity: 0.22 })
    );
    outerRing2.rotation.y = Math.PI / 3.2;
    astrolabeGroup.add(outerRing2);

    // Orbiting satellite beacons on the astrolabe rings
    const beaconGeo = new THREE.SphereGeometry(0.11, 12, 12);
    const beacon1 = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: 0x00f5d4 }));
    const beacon2 = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: 0xf72585 }));
    outerRing1.add(beacon1);
    outerRing2.add(beacon2);

    // -------------------------------------------------------------------------
    // LAYER C: Interactive 3D Neural Synapse Constellation
    // -------------------------------------------------------------------------
    const NODE_COUNT = 95;
    const MAX_LINK_DIST = 4.3;
    const MAX_SEGMENTS = 550;

    const nodePositions = new Float32Array(NODE_COUNT * 3);
    const nodeVelocities = [];
    const nodeBaseColors = new Float32Array(NODE_COUNT * 3);

    const palette = [
        new THREE.Color(0x00f5d4), // Cyan-mint
        new THREE.Color(0x38bdf8), // Sky blue
        new THREE.Color(0x818cf8), // Indigo
        new THREE.Color(0xf72585)  // Magenta
    ];

    for (let i = 0; i < NODE_COUNT; i++) {
        // Distribute nodes across a wide 3D volume so they frame the center card
        const angle = Math.random() * Math.PI * 2;
        const radius = 3.2 + Math.random() * 11.5;
        const x = Math.cos(angle) * radius * 1.35;
        const y = Math.sin(angle) * radius * 0.85;
        const z = (Math.random() - 0.5) * 18;

        nodePositions[i * 3] = x;
        nodePositions[i * 3 + 1] = y;
        nodePositions[i * 3 + 2] = z;

        nodeVelocities.push({
            vx: (Math.random() - 0.5) * 0.016,
            vy: (Math.random() - 0.5) * 0.016,
            vz: (Math.random() - 0.5) * 0.016
        });

        const c = palette[i % palette.length];
        nodeBaseColors[i * 3] = c.r;
        nodeBaseColors[i * 3 + 1] = c.g;
        nodeBaseColors[i * 3 + 2] = c.b;
    }

    const nodesGeo = new THREE.BufferGeometry();
    nodesGeo.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    nodesGeo.setAttribute("color", new THREE.BufferAttribute(nodeBaseColors, 3));

    const nodesMat = new THREE.PointsMaterial({
        size: 0.42,
        map: glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const nodePoints = new THREE.Points(nodesGeo, nodesMat);
    scene.add(nodePoints);

    // Pre-allocated dynamic line buffers for neural synapses
    const linePositions = new Float32Array(MAX_SEGMENTS * 6);
    const lineColors = new Float32Array(MAX_SEGMENTS * 6);
    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    linesGeo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    linesGeo.setDrawRange(0, 0);

    const linesMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending
    });
    const synapseLines = new THREE.LineSegments(linesGeo, linesMat);
    scene.add(synapseLines);

    // -------------------------------------------------------------------------
    // LAYER D: 3D Shockwave Rings & Particle Burst System
    // -------------------------------------------------------------------------
    const shockwaves = [];
    const bursts = [];

    function spawnShockwave(hexColor) {
        const geo = new THREE.RingGeometry(2.2, 2.45, 72);
        const mat = new THREE.MeshBasicMaterial({
            color: hexColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.z = 1;
        scene.add(mesh);
        shockwaves.push({ mesh, scale: 1, opacity: 0.85 });
    }

    function spawnParticleBurst(hexColor, count = 42) {
        const bPos = new Float32Array(count * 3);
        const bVel = [];
        for (let i = 0; i < count; i++) {
            bPos[i * 3] = (Math.random() - 0.5) * 2;
            bPos[i * 3 + 1] = (Math.random() - 0.5) * 2;
            bPos[i * 3 + 2] = 2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = 0.08 + Math.random() * 0.16;
            bVel.push({
                vx: Math.sin(phi) * Math.cos(theta) * speed,
                vy: Math.sin(phi) * Math.sin(theta) * speed,
                vz: Math.cos(phi) * speed
            });
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
        const mat = new THREE.PointsMaterial({
            size: 0.48,
            map: glowTexture,
            color: hexColor,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const points = new THREE.Points(geo, mat);
        scene.add(points);
        bursts.push({ points, vel: bVel, life: 1.0 });
    }

    // -------------------------------------------------------------------------
    // Interactive Mouse & Reaction Controllers
    // -------------------------------------------------------------------------
    let normMouseX = 0;
    let normMouseY = 0;
    const worldMouse = new THREE.Vector3(999, 999, 0);
    let energySurge = 0;
    let shakeIntensity = 0;
    let isHyperDrive = false;

    window.addEventListener("mousemove", (e) => {
        normMouseX = (e.clientX / window.innerWidth) * 2 - 1;
        normMouseY = -(e.clientY / window.innerHeight) * 2 + 1;

        // Project cursor onto z = 0 plane in 3D world space
        const vec = new THREE.Vector3(normMouseX, normMouseY, 0.5);
        vec.unproject(camera);
        const dir = vec.sub(camera.position).normalize();
        const dist = -camera.position.z / dir.z;
        worldMouse.copy(camera.position).add(dir.multiplyScalar(dist));
    });

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function triggerCoreReaction(type) {
        if (type === "correct") {
            waveMat.color.setHex(0x10b981);
            outerRing1.material.color.setHex(0x00f5d4);
            energySurge = 1.0;
            spawnShockwave(0x00f5d4);
            spawnParticleBurst(0x10b981, 45);
        } else if (type === "wrong") {
            waveMat.color.setHex(0xef4444);
            outerRing1.material.color.setHex(0xef4444);
            shakeIntensity = 0.42;
            spawnShockwave(0xef4444);
            spawnParticleBurst(0xef4444, 24);
        } else if (type === "celebrate") {
            waveMat.color.setHex(0x00f5d4);
            energySurge = 1.5;
            spawnShockwave(0x00f5d4);
            spawnParticleBurst(0x00f5d4, 55);
            setTimeout(() => {
                spawnShockwave(0x38bdf8);
                spawnParticleBurst(0xf72585, 55);
            }, 220);
        } else {
            waveMat.color.setHex(0x0ea5e9);
            outerRing1.material.color.setHex(0x00f5d4);
            energySurge = 0;
        }
    }

    const clock = new THREE.Clock();

    function animate3D() {
        requestAnimationFrame(animate3D);
        const t = clock.getElapsedTime();
        energySurge *= 0.96;

        // 1. Animate 3D Data-Wave Terrain
        const wAttr = waveGeo.attributes.position;
        const wArr = wAttr.array;
        const waveSpeed = t * (isHyperDrive ? 4.2 : 1.35 + energySurge * 2.5);
        const waveAmp = isHyperDrive ? 1.15 : 0.65 + energySurge * 0.55;

        for (let i = 0; i < wArr.length; i += 3) {
            const bx = waveBasePositions[i];
            const bz = waveBasePositions[i + 2];
            wArr[i + 1] =
                Math.sin(bx * 0.22 + waveSpeed) * Math.cos(bz * 0.24 + waveSpeed * 0.8) * waveAmp;
        }
        wAttr.needsUpdate = true;

        // 2. Rotate Peripheral Astrolabe Rings & Orbiting Beacons
        const ringSpeed = isHyperDrive ? 0.035 : 0.004 + energySurge * 0.02;
        outerRing1.rotation.z += ringSpeed;
        outerRing2.rotation.z -= ringSpeed * 1.3;
        astrolabeGroup.rotation.y = Math.sin(t * 0.3) * 0.25;

        beacon1.position.set(Math.cos(t * 1.4) * 6.9, Math.sin(t * 1.4) * 6.9, 0);
        beacon2.position.set(Math.cos(-t * 1.1) * 8.1, Math.sin(-t * 1.1) * 8.1, 0);

        // 3. Update Neural Constellation Nodes + Cursor Gravity
        const posArr = nodesGeo.attributes.position.array;
        const speedMult = isHyperDrive ? 7.5 : 1 + energySurge * 3.0;

        for (let i = 0; i < NODE_COUNT; i++) {
            const idx = i * 3;
            const vel = nodeVelocities[i];

            if (isHyperDrive) {
                // Hyperspace forward warp effect while generating quiz
                posArr[idx + 2] += 0.35;
                if (posArr[idx + 2] > 12) posArr[idx + 2] = -16;
            } else {
                posArr[idx] += vel.vx * speedMult;
                posArr[idx + 1] += vel.vy * speedMult;
                posArr[idx + 2] += vel.vz * speedMult;

                // Soft boundary wrap
                if (posArr[idx] > 16 || posArr[idx] < -16) vel.vx *= -1;
                if (posArr[idx + 1] > 10.5 || posArr[idx + 1] < -10.5) vel.vy *= -1;
                if (posArr[idx + 2] > 8 || posArr[idx + 2] < -14) vel.vz *= -1;

                // Cursor magnetic swirl interaction
                const dx = worldMouse.x - posArr[idx];
                const dy = worldMouse.y - posArr[idx + 1];
                const distSq = dx * dx + dy * dy;
                if (distSq < 18 && distSq > 0.01) {
                    const pull = 0.008;
                    posArr[idx] += dx * pull;
                    posArr[idx + 1] += dy * pull;
                }
            }
        }
        nodesGeo.attributes.position.needsUpdate = true;

        // 4. Rebuild Dynamic Synaptic Connections Between Nearby Nodes
        let vertexPtr = 0;
        let segmentCount = 0;
        const linkThreshold = isHyperDrive ? 5.2 : MAX_LINK_DIST + energySurge * 1.1;
        const linkThreshSq = linkThreshold * linkThreshold;

        for (let i = 0; i < NODE_COUNT && segmentCount < MAX_SEGMENTS; i++) {
            const ax = posArr[i * 3];
            const ay = posArr[i * 3 + 1];
            const az = posArr[i * 3 + 2];

            for (let j = i + 1; j < NODE_COUNT && segmentCount < MAX_SEGMENTS; j++) {
                const bx = posArr[j * 3];
                const by = posArr[j * 3 + 1];
                const bz = posArr[j * 3 + 2];

                const dx = ax - bx;
                const dy = ay - by;
                const dz = az - bz;
                const dSq = dx * dx + dy * dy + dz * dz;

                if (dSq < linkThreshSq) {
                    const fade = 1 - Math.sqrt(dSq) / linkThreshold;

                    linePositions[vertexPtr] = ax;
                    linePositions[vertexPtr + 1] = ay;
                    linePositions[vertexPtr + 2] = az;

                    linePositions[vertexPtr + 3] = bx;
                    linePositions[vertexPtr + 4] = by;
                    linePositions[vertexPtr + 5] = bz;

                    lineColors[vertexPtr] = nodeBaseColors[i * 3] * fade;
                    lineColors[vertexPtr + 1] = nodeBaseColors[i * 3 + 1] * fade;
                    lineColors[vertexPtr + 2] = nodeBaseColors[i * 3 + 2] * fade;

                    lineColors[vertexPtr + 3] = nodeBaseColors[j * 3] * fade;
                    lineColors[vertexPtr + 4] = nodeBaseColors[j * 3 + 1] * fade;
                    lineColors[vertexPtr + 5] = nodeBaseColors[j * 3 + 2] * fade;

                    vertexPtr += 6;
                    segmentCount++;
                }
            }
        }
        linesGeo.setDrawRange(0, segmentCount * 2);
        linesGeo.attributes.position.needsUpdate = true;
        linesGeo.attributes.color.needsUpdate = true;

        // 5. Update Expanding 3D Shockwaves
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.scale += 0.18;
            sw.opacity -= 0.024;
            sw.mesh.scale.set(sw.scale, sw.scale, 1);
            sw.mesh.material.opacity = Math.max(0, sw.opacity);
            if (sw.opacity <= 0) {
                scene.remove(sw.mesh);
                sw.mesh.geometry.dispose();
                sw.mesh.material.dispose();
                shockwaves.splice(i, 1);
            }
        }

        // 6. Update 3D Particle Bursts
        for (let i = bursts.length - 1; i >= 0; i--) {
            const b = bursts[i];
            b.life -= 0.025;
            const bArr = b.points.geometry.attributes.position.array;
            for (let k = 0; k < b.vel.length; k++) {
                bArr[k * 3] += b.vel[k].vx;
                bArr[k * 3 + 1] += b.vel[k].vy;
                bArr[k * 3 + 2] += b.vel[k].vz;
            }
            b.points.geometry.attributes.position.needsUpdate = true;
            b.points.material.opacity = Math.max(0, b.life);

            if (b.life <= 0) {
                scene.remove(b.points);
                b.points.geometry.dispose();
                b.points.material.dispose();
                bursts.splice(i, 1);
            }
        }

        // 7. Smooth Parallax Camera & Recoil Shake
        camera.position.x += (normMouseX * 2.4 - camera.position.x) * 0.045;
        camera.position.y += (0.6 + normMouseY * 1.6 - camera.position.y) * 0.045;

        if (shakeIntensity > 0.005) {
            camera.position.x += (Math.random() - 0.5) * shakeIntensity;
            camera.position.y += (Math.random() - 0.5) * shakeIntensity;
            shakeIntensity *= 0.88;
        }

        camera.lookAt(0, -0.4, 0);
        renderer.render(scene, camera);
    }
    animate3D();

    // =========================================================================
    // 2. 3D GYROSCOPIC CARD TILT & SPECULAR GLARE
    // =========================================================================
    document.querySelectorAll(".tilt-card").forEach((card) => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -4.5;
            const rotateY = ((x - centerX) / centerX) * 4.5;

            card.style.setProperty("--mouse-x", `${(x / rect.width) * 100}%`);
            card.style.setProperty("--mouse-y", `${(y / rect.height) * 100}%`);
            card.style.transform = `perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "perspective(1400px) rotateX(0deg) rotateY(0deg)";
        });
    });

    // =========================================================================
    // 3. INTERACTIVE QUIZ STATE & UI LOGIC
    // =========================================================================
    const uploadStage = document.getElementById("upload-stage");
    const quizStage = document.getElementById("quiz-stage");
    const resultStage = document.getElementById("result-stage");

    const uploadForm = document.getElementById("upload-form");
    const fileInput = document.getElementById("file-input");
    const fileLabel = document.getElementById("file-label");
    const dropZone = document.getElementById("drop-zone");
    const generateBtn = document.getElementById("generate-btn");
    const loaderBox = document.getElementById("loader-box");
    const errorBox = document.getElementById("error-box");

    const hudStats = document.getElementById("hud-stats");
    const streakPill = document.getElementById("streak-pill");
    const streakCountEl = document.getElementById("streak-count");
    const liveScoreEl = document.getElementById("live-score");
    const liveTotalEl = document.getElementById("live-total");

    const progressNodes = document.getElementById("progress-nodes");
    const questionCard = document.getElementById("question-card");
    const qCounter = document.getElementById("q-counter");
    const qDocName = document.getElementById("q-doc-name");
    const qText = document.getElementById("q-text");
    const optionsGrid = document.getElementById("options-grid");
    const feedbackDrawer = document.getElementById("feedback-drawer");
    const statusPill = document.getElementById("status-pill");
    const explanationText = document.getElementById("explanation-text");
    const citationQuote = document.getElementById("citation-quote");
    const nextBtn = document.getElementById("next-btn");

    let quizState = {
        quizId: null,
        docName: "",
        questions: [],
        currentIndex: 0,
        score: 0,
        streak: 0,
        outcomes: []
    };

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            fileLabel.textContent = `Selected: ${fileInput.files[0].name}`;
        }
    });

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            fileLabel.textContent = `Selected: ${e.dataTransfer.files[0].name}`;
        }
    });

    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!fileInput.files.length) return;

        errorBox.classList.add("hidden");
        loaderBox.classList.remove("hidden");
        generateBtn.disabled = true;
        isHyperDrive = true;

        const formData = new FormData();
        formData.append("document", fileInput.files[0]);

        try {
            const res = await fetch("/generate", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate quiz.");
            startQuizSession(data);
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove("hidden");
        } finally {
            loaderBox.classList.add("hidden");
            generateBtn.disabled = false;
            isHyperDrive = false;
        }
    });

    document.querySelectorAll(".saved-chip").forEach((chip) => {
        chip.addEventListener("click", async () => {
            const id = chip.dataset.quizId;
            isHyperDrive = true;
            try {
                const res = await fetch(`/quiz/${id}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Unable to load saved deck.");
                startQuizSession(data);
            } catch (err) {
                errorBox.textContent = err.message;
                errorBox.classList.remove("hidden");
            } finally {
                isHyperDrive = false;
            }
        });
    });

    function startQuizSession(data) {
        quizState = {
            quizId: data.quiz_id,
            docName: data.doc_name,
            questions: data.questions,
            currentIndex: 0,
            score: 0,
            streak: 0,
            outcomes: new Array(data.questions.length).fill(null)
        };

        triggerCoreReaction("reset");
        uploadStage.classList.add("hidden");
        resultStage.classList.add("hidden");
        quizStage.classList.remove("hidden");
        hudStats.classList.remove("hidden");

        liveScoreEl.textContent = "0";
        liveTotalEl.textContent = data.questions.length;
        streakCountEl.textContent = "0";
        streakPill.classList.remove("hot");

        renderProgressNodes();
        renderQuestion(false);
    }

    function renderProgressNodes() {
        progressNodes.innerHTML = "";
        quizState.questions.forEach((_, idx) => {
            const node = document.createElement("div");
            node.className = "p-node";
            if (idx === quizState.currentIndex) node.classList.add("active");
            if (quizState.outcomes[idx] === true) node.classList.add("correct");
            if (quizState.outcomes[idx] === false) node.classList.add("wrong");
            progressNodes.appendChild(node);
        });
    }

    function renderQuestion(animateFlip = true) {
        const q = quizState.questions[quizState.currentIndex];
        const total = quizState.questions.length;

        const populate = () => {
            qCounter.textContent = `Question ${quizState.currentIndex + 1} of ${total}`;
            qDocName.textContent = quizState.docName;
            qText.textContent = q.question;
            feedbackDrawer.classList.add("hidden");
            nextBtn.classList.add("hidden");
            optionsGrid.innerHTML = "";

            const letters = ["A", "B", "C", "D"];
            q.options.forEach((optText, optIdx) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "opt-btn";
                btn.innerHTML = `
                    <span class="opt-letter">${letters[optIdx] || optIdx + 1}</span>
                    <span>${optText}</span>
                `;
                btn.addEventListener("click", () => handleAnswerSelection(optIdx));
                optionsGrid.appendChild(btn);
            });
        };

        if (animateFlip) {
            questionCard.classList.add("card-flip-out");
            setTimeout(() => {
                questionCard.classList.remove("card-flip-out");
                populate();
                questionCard.classList.add("card-flip-in");
                setTimeout(() => questionCard.classList.remove("card-flip-in"), 420);
            }, 300);
        } else {
            populate();
            questionCard.classList.add("card-flip-in");
            setTimeout(() => questionCard.classList.remove("card-flip-in"), 420);
        }
    }

    function handleAnswerSelection(selectedIdx) {
        const q = quizState.questions[quizState.currentIndex];
        const isCorrect = selectedIdx === q.correct_index;
        const buttons = optionsGrid.querySelectorAll(".opt-btn");

        buttons.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === selectedIdx) {
                btn.classList.add(isCorrect ? "chosen-correct" : "chosen-wrong");
            } else if (!isCorrect && idx === q.correct_index) {
                btn.classList.add("reveal-correct");
            } else {
                btn.classList.add("dimmed");
            }
        });

        quizState.outcomes[quizState.currentIndex] = isCorrect;

        if (isCorrect) {
            quizState.score += 1;
            quizState.streak += 1;
            statusPill.textContent = "✓ Verified Correct";
            statusPill.className = "status-pill pass";
            triggerCoreReaction("correct");
        } else {
            quizState.streak = 0;
            statusPill.textContent = "✗ Incorrect • Question Locked";
            statusPill.className = "status-pill fail";
            triggerCoreReaction("wrong");
        }

        liveScoreEl.textContent = quizState.score;
        streakCountEl.textContent = quizState.streak;
        streakPill.classList.toggle("hot", quizState.streak >= 2);

        explanationText.textContent = q.explanation || "Review the source citation below.";
        citationQuote.textContent = q.citation ? `"${q.citation}"` : "";
        feedbackDrawer.classList.remove("hidden");

        renderProgressNodes();

        const isLast = quizState.currentIndex === quizState.questions.length - 1;
        nextBtn.textContent = isLast ? "View Final Score & Analysis →" : "Next Question →";
        nextBtn.classList.remove("hidden");
    }

    nextBtn.addEventListener("click", () => {
        if (quizState.currentIndex < quizState.questions.length - 1) {
            quizState.currentIndex += 1;
            renderProgressNodes();
            renderQuestion(true);
        } else {
            showFinalResults();
        }
    });

    function showFinalResults() {
        quizStage.classList.add("hidden");
        resultStage.classList.remove("hidden");

        const total = quizState.questions.length;
        const percentage = Math.round((quizState.score / total) * 100);

        document.getElementById("final-percent").textContent = `${percentage}%`;
        document.getElementById("final-fraction").textContent = `${quizState.score} / ${total} Correct`;

        const ringFill = document.getElementById("score-ring-fill");
        const circumference = 364.4;
        const offset = circumference - (percentage / 100) * circumference;

        const titleEl = document.getElementById("motivation-title");
        const quoteEl = document.getElementById("motivation-quote");

        if (percentage >= 80) {
            ringFill.style.stroke = "#00f5d4";
            titleEl.textContent = "Outstanding Mastery!";
            quoteEl.textContent = "You commanded the material with precision. Keep pushing your limits!";
            triggerCoreReaction("celebrate");
        } else if (percentage >= 50) {
            ringFill.style.stroke = "#38bdf8";
            titleEl.textContent = "Solid Momentum!";
            quoteEl.textContent = "Strong grasp of core ideas. Shuffle and retake to lock in 100% mastery.";
            triggerCoreReaction("correct");
        } else {
            ringFill.style.stroke = "#f59e0b";
            titleEl.textContent = "Every Attempt Sharpens Recall!";
            quoteEl.textContent = "Active testing builds neural pathways faster than passive reading. Review the citations and try again!";
        }

        requestAnimationFrame(() => {
            ringFill.style.strokeDashoffset = offset;
        });
    }

    document.getElementById("retake-btn").addEventListener("click", async () => {
        if (!quizState.quizId) return;
        const res = await fetch(`/quiz/${quizState.quizId}`);
        const data = await res.json();
        if (res.ok) startQuizSession(data);
    });

    document.getElementById("new-doc-btn").addEventListener("click", () => {
        resultStage.classList.add("hidden");
        hudStats.classList.add("hidden");
        uploadStage.classList.remove("hidden");
        triggerCoreReaction("reset");
    });
})();