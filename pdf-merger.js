// 전역 변수: 사용자가 추가한 File 객체를 저장하고, 이 순서대로 병합이 진행됩니다.
let pdfFiles = [];

// DOM 요소 캐싱
const elements = {
    fileInput: document.getElementById('file-input'),
    addFilesBtn: document.getElementById('add-files-btn'),
    clearListBtn: document.getElementById('clear-list-btn'),
    mergeStartBtn: document.getElementById('merge-start-btn'),
    fileList: document.getElementById('file-list'),
    fileCount: document.getElementById('file-count'),
    outputFilename: document.getElementById('output-filename'),
    dropArea: document.getElementById('drop-area'),
    statusMessage: document.getElementById('status-message'),
    progressContainer: document.getElementById('progress-container'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
};

/**
 * 1. 상태 메시지 업데이트 함수 (명확한 상태 표시)
 * @param {string} message - 표시할 메시지
 * @param {'ready'|'success'|'error'|'progress'} type - 메시지 타입 (색상 결정)
 */
function updateStatus(message, type = 'ready') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = 'status-message'; // 클래스 초기화

    switch (type) {
        case 'success':
            elements.statusMessage.classList.add('success');
            break;
        case 'error':
            elements.statusMessage.classList.add('error');
            break;
        case 'progress':
            // 진행 중 상태는 기본 색상을 사용하거나, 별도의 스타일을 추가할 수 있습니다.
            elements.statusMessage.style.backgroundColor = '#d1ecf1'; 
            elements.statusMessage.style.color = '#0c5460';
            elements.statusMessage.style.borderColor = '#bee5eb';
            break;
        default:
            // 준비 완료 상태
            elements.statusMessage.style.backgroundColor = ''; 
            elements.statusMessage.style.color = '';
            elements.statusMessage.style.borderColor = '';
            break;
    }
}

/**
 * 2. 실행 조건 확인 및 버튼 활성화/비활성화
 * 파일이 2개 미만일 경우 'PDF 병합 시작' 버튼 비활성화 (2.2)
 */
function checkMergeEligibility() {
    elements.fileCount.textContent = pdfFiles.length;

    if (pdfFiles.length >= 2) {
        elements.mergeStartBtn.disabled = false;
        if (elements.statusMessage.classList.contains('error') || elements.statusMessage.classList.contains('success')) {
             // 오류나 성공 상태가 아닐 경우에만 기본 메시지로 복구
        } else {
             updateStatus(`✅ 병합 준비 완료. 현재 ${pdfFiles.length}개 파일.`);
        }
       
    } else {
        elements.mergeStartBtn.disabled = true;
        updateStatus("⚠️ 준비 완료. 병합할 파일을 2개 이상 추가해 주세요.");
    }
}

/**
 * 3. 파일 목록 렌더링 (순서 변경 기능 포함)
 */
function renderFileList() {
    elements.fileList.innerHTML = ''; // 기존 목록 초기화

    pdfFiles.forEach((file, index) => {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-index', index);

        // 파일명과 순서 표시 (2.1)
        listItem.innerHTML = `
            <span class="file-name">${index + 1}. ${file.name}</span>
            <div class="order-controls">
                <button class="move-up-btn" data-index="${index}" ${index === 0 ? 'disabled' : ''}>▲</button>
                <button class="move-down-btn" data-index="${index}" ${index === pdfFiles.length - 1 ? 'disabled' : ''}>▼</button>
                <button class="remove-btn" data-index="${index}">🗑️</button>
            </div>
        `;

        elements.fileList.appendChild(listItem);
    });

    checkMergeEligibility();
}

/**
 * 4. 파일 추가 핸들러
 * @param {FileList} fileList - 추가할 파일 목록
 */
function handleFileAddition(fileList) {
    const newFiles = Array.from(fileList).filter(file => file.type === 'application/pdf');

    if (newFiles.length === 0) {
        updateStatus("❌ PDF 파일만 추가할 수 있습니다.", 'error');
        return;
    }
    
    // PDF 파일만 필터링하여 기존 목록에 추가
    pdfFiles.push(...newFiles);
    
    // 파일 목록 다시 렌더링
    renderFileList();
    updateStatus(`➕ ${newFiles.length}개의 PDF 파일을 목록에 추가했습니다.`, 'ready');
}

/**
 * 5. 파일 순서 변경 로직 (2.1)
 * @param {number} index - 이동할 파일의 현재 인덱스
 * @param {number} newIndex - 파일이 이동할 새 인덱스
 */
function moveFile(index, newIndex) {
    if (newIndex >= 0 && newIndex < pdfFiles.length) {
        const [movedFile] = pdfFiles.splice(index, 1); // 기존 위치에서 제거
        pdfFiles.splice(newIndex, 0, movedFile); // 새 위치에 삽입
        renderFileList();
        updateStatus("순서가 변경되었습니다.", 'ready');
    }
}

/**
 * 6. PDF 병합 로직 (PDF-LIB 사용)
 */
/**
 * 6. PDF 병합 로직 (PDF-LIB 사용)
 */
async function startMerge() {
    if (pdfFiles.length < 2) {
        updateStatus("❌ 병합하려면 PDF 파일이 최소 2개 필요합니다.", 'error');
        return;
    }

    elements.mergeStartBtn.disabled = true;
    updateStatus("⏳ PDF 병합 시작 중...", 'progress');

    // 진행률 표시줄 초기화 및 표시
    elements.progressContainer.style.display = 'flex';
    elements.progressBar.style.width = '0%';
    elements.progressText.textContent = '0%';

    try {
        const mergedPdf = await PDFLib.PDFDocument.create();
        const totalFiles = pdfFiles.length;

        for (let i = 0; i < totalFiles; i++) {
            const file = pdfFiles[i];
            
            // -------------------- 진행률 업데이트 --------------------
            // 파일 복사 및 처리 단계를 기준으로 진행률 계산
            const progress = Math.round(((i + 1) / totalFiles) * 100);
            
            elements.progressBar.style.width = `${progress}%`;
            elements.progressText.textContent = `${progress}%`;
            
            updateStatus(`⏳ [${i + 1}/${totalFiles}] ${file.name} 처리 중...`);
            // --------------------------------------------------------

            const arrayBuffer = await file.arrayBuffer();
            const donorPdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());

            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }

        // 100% 완료 후 상태 업데이트
        elements.progressBar.style.width = '100%';
        elements.progressText.textContent = '100%';
        updateStatus("💾 최종 문서 생성 및 다운로드 준비 중...", 'progress');

        const pdfBytes = await mergedPdf.save();
        const filename = (elements.outputFilename.value || 'merged_document') + '.pdf';
        downloadPdf(pdfBytes, filename);

        updateStatus(`🎉 성공: ${totalFiles}개 파일 병합 완료!`, 'success');

    } catch (error) {
        console.error("PDF 병합 실패:", error);
        updateStatus(`❌ 병합 실패: ${error.message}. 콘솔을 확인하세요.`, 'error');
    } finally {
        // 작업 완료 후 버튼 상태 복구 및 진행률 표시줄 숨기기
        elements.mergeStartBtn.disabled = false;
        elements.progressContainer.style.display = 'none';
        checkMergeEligibility(); 
    }
}

/**
 * 7. 바이트 배열을 파일로 다운로드하는 유틸리티 함수
 * @param {Uint8Array} bytes - PDF 파일의 바이트 데이터
 * @param {string} filename - 다운로드할 파일 이름
 */
function downloadPdf(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// -------------------- 이벤트 리스너 설정 --------------------

// 1. 파일 추가 버튼 클릭 시
elements.addFilesBtn.addEventListener('click', () => {
    elements.fileInput.click();
});

// 2. 파일 입력 변경 시 (파일 선택 완료)
elements.fileInput.addEventListener('change', (e) => {
    handleFileAddition(e.target.files);
    e.target.value = ''; // 같은 파일을 다시 선택할 수 있도록 초기화
});

// 3. 드래그 앤 드롭 기능 (2.1)
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    elements.dropArea.addEventListener(eventName, preventDefaults, false);
});
['dragenter', 'dragover'].forEach(eventName => {
    elements.dropArea.addEventListener(eventName, () => elements.dropArea.classList.add('highlight'), false);
});
['dragleave', 'drop'].forEach(eventName => {
    elements.dropArea.addEventListener(eventName, () => elements.dropArea.classList.remove('highlight'), false);
});

elements.dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFileAddition(files);
}, false);

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// 4. 목록 초기화 버튼 클릭 시 (2.1)
elements.clearListBtn.addEventListener('click', () => {
    pdfFiles = [];
    renderFileList();
    updateStatus("목록이 초기화되었습니다.", 'ready');
});

// 5. 파일 목록 내의 버튼 (순서 변경/삭제) 클릭 시
elements.fileList.addEventListener('click', (e) => {
    const target = e.target;
    const index = parseInt(target.getAttribute('data-index'));

    if (isNaN(index)) return;

    if (target.classList.contains('move-up-btn')) {
        moveFile(index, index - 1);
    } else if (target.classList.contains('move-down-btn')) {
        moveFile(index, index + 1);
    } else if (target.classList.contains('remove-btn')) {
        // 개별 삭제 (2.1)
        pdfFiles.splice(index, 1); 
        renderFileList();
        updateStatus("파일이 목록에서 제거되었습니다.", 'ready');
    }
});

// 6. PDF 병합 시작 버튼 클릭 시
elements.mergeStartBtn.addEventListener('click', startMerge);

// 초기 상태 체크
checkMergeEligibility();