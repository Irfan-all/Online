// ⚠️ MASUKKAN URL WEB APP GOOGLE APPS SCRIPT ANDA
const scriptUrl = "https://script.google.com/macros/s/AKfycbytedJeFJgCQAv67WPJTZ_yewcku0dRsUW64prcjrAIZCzsHYikUB6kEGsWZUTynCBI2w/exec";

let emailSiswa = "", namaSiswa = "", kelasSiswa = "", nisnSiswa = "", mapelSiswa = "";
let jawabanSiswa = {};
let raguSiswa = {};
let allQuestions = [];
let dataSiswaGlobal = [];
let currentPage = 0;
const pageSize = 1;

let violationCount = 0;
let isUjianActive = false;
let isPermanentlyLocked = false;
let initialHeight = window.innerHeight;

let totalSeconds = 2400;
let timerInterval = null;
let audioCtx = null;

function tampilPesan(judul, pesan, ikon = 'warning') {
    Swal.fire({
        title: judul,
        text: pesan,
        icon: ikon,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'OK'
    });
}

function tampilKonfirmasi(judul, pesan, fungsiAksi) {
    Swal.fire({
        title: judul,
        text: pesan,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#dc2626',
        confirmButtonText: 'Ya, Lanjutkan',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            fungsiAksi();
        }
    });
}

/* MODAL PROFIL GURU */
function bukaProfilModal() {
    document.getElementById('profile-modal').style.display = 'flex';
}

function tutupProfilModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

window.onload = function() {
    fetch(scriptUrl + "?action=getDataSiswa")
        .then(response => response.json())
        .then(data => {
            dataSiswaGlobal = data || [];
            muatDaftarKelas();
        })
        .catch(err => {
            console.error("Gagal memuat data kelas:", err);
            let selectKelas = document.getElementById('kelas');
            if (selectKelas) {
                selectKelas.innerHTML = '<option value="">-- Gagal Memuat Data (Cek URL Web App) --</option>';
            }
        });
};

function muatDaftarKelas() {
    let selectKelas = document.getElementById('kelas');
    let daftarKelas = [...new Set(dataSiswaGlobal.map(item => item.kelas))];
    
    selectKelas.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    daftarKelas.forEach(function(k) {
        if (k) selectKelas.innerHTML += `<option value="${k}">${k}</option>`;
    });
}

function onKelasChange() {
    let selectedKelas = document.getElementById('kelas').value;
    let selectNama = document.getElementById('nama');
    let inputNisn = document.getElementById('nisn');

    inputNisn.value = '';
    selectNama.innerHTML = '<option value="">-- Pilih Nama Siswa --</option>';

    if (!selectedKelas) {
        selectNama.disabled = true;
        return;
    }

    let siswaFilter = dataSiswaGlobal.filter(item => item.kelas === selectedKelas);
    siswaFilter.sort((a, b) => a.nama.localeCompare(b.nama));

    siswaFilter.forEach(function(siswa) {
        selectNama.innerHTML += `<option value="${siswa.nama}">${siswa.nama}</option>`;
    });

    selectNama.disabled = false;
}

function onNamaChange() {
    let selectedKelas = document.getElementById('kelas').value;
    let selectedNama = document.getElementById('nama').value;
    let inputNisn = document.getElementById('nisn');

    if (!selectedNama) {
        inputNisn.value = '';
        return;
    }

    let siswaDitemukan = dataSiswaGlobal.find(item => item.kelas === selectedKelas && item.nama === selectedNama);
    if (siswaDitemukan) {
        inputNisn.value = siswaDitemukan.nisn;
    } else {
        inputNisn.value = '';
    }
}

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playWarningSound() {
    if ("vibrate" in navigator) navigator.vibrate([500, 150, 500, 150, 500]);

    const lockScreen = document.getElementById('lock-screen');
    lockScreen.classList.add('screen-flash');
    setTimeout(() => lockScreen.classList.remove('screen-flash'), 2000);

    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(1.0, now);

        const osc1 = audioCtx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(600, now);
        osc1.frequency.linearRampToValueAtTime(1700, now + 0.5);
        osc1.frequency.linearRampToValueAtTime(600, now + 1.0);

        osc1.connect(masterGain);
        masterGain.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 2.0);
    } catch(e) {}
}

function verifikasiMulai() {
    initAudio();

    emailSiswa = document.getElementById('email').value.trim();
    kelasSiswa = document.getElementById('kelas').value;
    namaSiswa = document.getElementById('nama').value;
    nisnSiswa = document.getElementById('nisn').value.trim();
    let tokenInput = document.getElementById('token').value.trim();

    if (!emailSiswa || !kelasSiswa || !namaSiswa || !nisnSiswa || !tokenInput) {
        tampilPesan("DATA BELUM LENGKAP", "Harap isi Email, Pilih Kelas, Nama, dan Token Ujian!", "warning");
        return;
    }

    let btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.innerText = "Memverifikasi Akses...";

    let urlLogin = scriptUrl + "?action=verifikasiLogin" +
        "&email=" + encodeURIComponent(emailSiswa) +
        "&nisn=" + encodeURIComponent(nisnSiswa) +
        "&token=" + encodeURIComponent(tokenInput);

    fetch(urlLogin)
        .then(res => res.json())
        .then(res => {
            if (res.canLogin) {
                mapelSiswa = res.mapel;
                document.getElementById('mapel-title').innerText = "Mata Pelajaran: " + mapelSiswa;
                
                document.getElementById('login-box').style.display = 'none';
                document.getElementById('rules-page').style.display = 'block';

                fetch(scriptUrl + "?action=getSoal&mapel=" + encodeURIComponent(mapelSiswa))
                    .then(r => r.json())
                    .then(dataSoal => initSoal(dataSoal));
            } else {
                tampilPesan("GAGAL MASUK", res.message, "error");
                btn.disabled = false;
                btn.innerText = "Verifikasi Identitas";
            }
        })
        .catch(err => {
            tampilPesan("ERROR KONEKSI", "Gagal terhubung ke server verifikasi.", "error");
            btn.disabled = false;
            btn.innerText = "Verifikasi Identitas";
        });
}

function toggleBtnMulai() {
    let checkbox = document.getElementById('check-agree');
    let btnMulai = document.getElementById('btn-start-exam');
    btnMulai.disabled = !checkbox.checked;
}

function mulaiMengerjakanSoal() {
    document.getElementById('rules-page').style.display = 'none';
    document.getElementById('exam-box').style.display = 'block';
    
    isUjianActive = true;
    initialHeight = window.innerHeight;

    jalankanTimer();
    initAntiCheat();
}

function jalankanTimer() {
    const display = document.getElementById('time-display');
    timerInterval = setInterval(() => {
        if (totalSeconds <= 0) {
            clearInterval(timerInterval);
            tampilPesan("WAKTU HABIS", "Waktu pengerjaan telah HABIS! Jawaban Anda otomatis dikirim.", "info");
            submitJawaban(true, "HABIS_WAKTU");
            return;
        }
        totalSeconds--;
        let mins = Math.floor(totalSeconds / 60);
        let secs = totalSeconds % 60;
        display.innerText = `${mins}:${secs < 10 ? '0' + secs : secs}`;
    }, 1000);
}

function initSoal(data) {
    allQuestions = data || [];
    currentPage = 0;
    renderPage();
}

function renderPage() {
    let container = document.getElementById('daftar-soal-container');
    container.innerHTML = "";

    if (!allQuestions || allQuestions.length === 0) {
        container.innerHTML = "<p style='text-align:center;'>Soal tidak ditemukan untuk mata pelajaran ini.</p>";
        return;
    }

    let totalPages = Math.ceil(allQuestions.length / pageSize);
    let start = currentPage * pageSize;
    let end = Math.min(start + pageSize, allQuestions.length);
    let pageItems = allQuestions.slice(start, end);
    let labels = ['A', 'B', 'C', 'D'];

    pageItems.forEach((item, indexOnPage) => {
        let nomorSoal = start + indexOnPage + 1;
        let opsiHtml = "";

        item.opsi.forEach((op, idx) => {
            let isChecked = (jawabanSiswa[item.id] === op.originalKey) ? "checked" : "";
            opsiHtml += `
                <label class="opsi-item">
                    <input type="radio" name="soal_${item.id}" value="${op.originalKey}" ${isChecked} onchange="simpanJawaban(${item.id}, '${op.originalKey}')">
                    ${labels[idx]}. ${op.teks}
                </label>
            `;
        });

        let isRaguChecked = raguSiswa[item.id] ? "checked" : "";

        container.innerHTML += `
            <div class="soal-card" id="card-soal-${item.id}">
                <div class="soal-text">${nomorSoal}. ${item.soal} <span style="font-size:12px; color:gray;">(${item.poin} Poin)</span></div>
                <div class="opsi-container">${opsiHtml}</div>
                <div class="ragu-container">
                    <label>
                        <input type="checkbox" id="ragu-${item.id}" ${isRaguChecked} onchange="toggleRagu(${item.id})">
                        🟡 Tandai Ragu-Ragu
                    </label>
                </div>
            </div>
        `;
    });

    document.getElementById('page-indicator').innerText = `Halaman ${currentPage + 1} dari ${totalPages}`;
    document.getElementById('btn-prev').disabled = (currentPage === 0);
    
    if (currentPage === totalPages - 1) {
        document.getElementById('btn-next').style.display = 'none';
        document.getElementById('btn-submit').style.display = 'inline-block';
    } else {
        document.getElementById('btn-next').style.display = 'inline-block';
        document.getElementById('btn-submit').style.display = 'none';
    }

    window.scrollTo(0, 0);
}

function gantiHalaman(direction) {
    currentPage += direction;
    renderPage();
}

function simpanJawaban(soalId, pilihan) {
    jawabanSiswa[soalId] = pilihan;
}

function toggleRagu(soalId) {
    let checkbox = document.getElementById(`ragu-${soalId}`);
    if (checkbox && checkbox.checked) {
        raguSiswa[soalId] = true;
    } else {
        delete raguSiswa[soalId];
    }
}

function bukaGridModal() {
    renderGridModal();
    document.getElementById('grid-modal').style.display = 'flex';
}

function tutupGridModal() {
    document.getElementById('grid-modal').style.display = 'none';
}

function renderGridModal() {
    let container = document.getElementById('grid-soal-container');
    container.innerHTML = "";

    allQuestions.forEach((item, index) => {
        let nomor = index + 1;
        let classStatus = "";

        if (raguSiswa[item.id]) {
            classStatus = "ragu";
        } else if (jawabanSiswa[item.id]) {
            classStatus = "terjawab";
        }

        if (index === currentPage) {
            classStatus += " aktif";
        }

        container.innerHTML += `
            <div class="grid-item ${classStatus}" onclick="lompatKeSoal(${index})">
                ${nomor}
            </div>
        `;
    });
}

function lompatKeSoal(targetIndex) {
    currentPage = targetIndex;
    renderPage();
    tutupGridModal();
}

function submitJawaban(isAutoSubmit, statusReason) {
    if (!isAutoSubmit) {
        let unansweredAll = [];
        let raguAll = [];

        allQuestions.forEach((item, idx) => {
            if (!jawabanSiswa[item.id]) unansweredAll.push(idx + 1);
            if (raguSiswa[item.id]) raguAll.push(idx + 1);
        });

        let pesanPeringatan = "";
        if (unansweredAll.length > 0) {
            pesanPeringatan += `Masih ada ${unansweredAll.length} soal belum dijawab (Nomor: ${unansweredAll.join(", ")}).`;
        }
        if (raguAll.length > 0) {
            pesanPeringatan += `<br>Masih ada ${raguAll.length} soal ditandai Ragu-Ragu (Nomor: ${raguAll.join(", ")}).`;
        }

        let textKonfirmasi = pesanPeringatan !== "" ? 
            pesanPeringatan + "<br>Apakah Anda tetap yakin ingin mengakhiri ujian?" : 
            "Apakah Anda yakin ingin mengakhiri dan mengirim seluruh jawaban?";

        tampilKonfirmasi(
            "KONFIRMASI UJIAN", 
            textKonfirmasi, 
            function() {
                prosesSelesaiDanKirim(isAutoSubmit, statusReason);
            }
        );
        return;
    }

    prosesSelesaiDanKirim(isAutoSubmit, statusReason);
}

function prosesSelesaiDanKirim(isAutoSubmit, statusReason) {
    isUjianActive = false;
    clearInterval(timerInterval);

    let examBox = document.getElementById('exam-box');
    examBox.innerHTML = "<h3 id='status-kirim' style='text-align:center; padding:30px;'>Sedang menyambungkan ke server...</h3>";

    let delay = isAutoSubmit ? Math.floor(Math.random() * 5000) : 0;

    setTimeout(function() {
        eksekusiKirimJawaban(statusReason);
    }, delay);
}

function eksekusiKirimJawaban(statusReason) {
    let statusText = document.getElementById('status-kirim');
    if (statusText) statusText.innerText = "Mengirim jawaban ke server...";

    let payload = {
        email: emailSiswa,
        nama: namaSiswa,
        kelas: kelasSiswa,
        nisn: nisnSiswa,
        mapel: mapelSiswa,
        jawabanJson: JSON.stringify(jawabanSiswa),
        pelanggaran: violationCount,
        statusUjian: statusReason || "SELESAI"
    };

    fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(res => {
        if (res.status === "SUCCESS") {
            tampilkanHasil(res);
        } else {
            tampilPesan("ERROR SERVER", res.message || "Gagal menyimpan data.", "error");
            if (statusText) statusText.innerText = "Gagal menyimpan jawaban. Silakan hubungi pengawas.";
        }
    })
    .catch(err => {
        tampilPesan("GAGAL MENGIRIM", "Terjadi kesalahan koneksi. Silakan klik tombol di bawah untuk mencoba kembali.", "error");
        if (statusText) {
            statusText.innerHTML = `
                <p style="color:red;">Koneksi terputus saat mengirim data.</p>
                <button onclick="eksekusiKirimJawaban('${statusReason}')" style="background:#16a34a; padding:10px 20px;">Coba Kirim Ulang</button>
            `;
        }
    });
}

function tampilkanHasil(res) {
    document.getElementById('exam-box').style.display = 'none';
    document.getElementById('result-box').style.display = 'block';

    if (res.statusUjian === "DIBLOKIR_CURANG") {
        document.getElementById('result-title').innerText = "AKUN DIBLOKIR (KECURANGAN)";
        document.getElementById('result-title').style.color = "#dc2626";
        document.getElementById('result-desc').innerText = "Anda melebihi batas toleransi kecurangan.";
    }

    document.getElementById('skor-display').innerText = `Skor: ${res.skor} / ${res.maxSkor}`;
}

function initAntiCheat() {
    let violationTimer = null;

    window.addEventListener('resize', function() {
        if (!isUjianActive || isPermanentlyLocked) return;
        let heightRatio = window.innerHeight / initialHeight;
        let screenRatio = window.innerHeight / window.screen.height;

        if (heightRatio < 0.75 || screenRatio < 0.60) {
            prosesPelanggaran("Terdeteksi menggunakan Layar Terbagi (Split Screen)!");
        }
    });

    window.addEventListener('blur', function() {
        if (!isUjianActive || isPermanentlyLocked) return;
        let screenRatio = window.innerHeight / window.screen.height;
        if (screenRatio < 0.75) {
            prosesPelanggaran("Terdeteksi menyentuh aplikasi lain pada Split Screen!");
        }
    });

    document.addEventListener('visibilitychange', function() {
        if (!isUjianActive || isPermanentlyLocked) return;

        if (document.hidden) {
            violationTimer = setTimeout(function() {
                if (document.hidden && isUjianActive && !isPermanentlyLocked) {
                    prosesPelanggaran("Terdeteksi meninggalkan halaman ujian!");
                }
            }, 1200);
        } else {
            if (violationTimer) clearTimeout(violationTimer);
        }
    });

    function prosesPelanggaran(pesanPeringatan) {
        violationCount++;
        playWarningSound();

        if (violationCount > 2) {
            isPermanentlyLocked = true;
            document.getElementById('lock-screen').style.display = 'block';
            document.getElementById('lock-title').innerText = "DIBLOKIR PERMANEN!";
            document.getElementById('lock-desc').innerText = "Anda telah melakukan kecurangan lebih dari 2 kali!";
            
            setTimeout(() => {
                document.getElementById('lock-screen').style.display = 'none';
                submitJawaban(true, "DIBLOKIR_CURANG");
            }, 2500);
        } else {
            document.getElementById('lock-screen').style.display = 'block';
            document.getElementById('warning-box').style.display = 'block';
            document.getElementById('warning-box').innerText = `PERINGATAN (${violationCount}/2): ${pesanPeringatan}`;
        }
    }

    document.getElementById('lock-screen').addEventListener('click', function() {
        if (!isPermanentlyLocked) document.getElementById('lock-screen').style.display = 'none';
    });

    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('paste', e => e.preventDefault());
}
