// グローバル変数
let currentFilter = 'all';
let currentManagingEvent = null;
let currentManagingEventId = null;

// Firebase初期化完了を待つ
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.db && window.firestore) {
            resolve();
        } else {
            setTimeout(() => waitForFirebase().then(resolve), 100);
        }
    });
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('ページ読み込み完了');
    
    // Firebaseの初期化を待つ
    await waitForFirebase();
    console.log('Firebase準備完了');
    
    showTab('events');
    loadEvents();
    loadManageEventList();

    // イベント作成フォームの送信
    document.getElementById('create-event-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('イベント作成フォーム送信');
        await createEvent();
    });

    // 回答フォームの送信
    document.getElementById('response-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitResponse();
    });
    
    console.log('初期化完了');
});

// タブ切り替え
function showTab(tabName) {
    console.log('showTab呼び出し:', tabName);
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('border-blue-600', 'text-blue-600');
        button.classList.add('border-transparent', 'text-gray-600');
    });

    const contentElement = document.getElementById(`content-${tabName}`);
    const tabElement = document.getElementById(`tab-${tabName}`);
    
    if (!contentElement || !tabElement) {
        console.error(`タブ要素が見つかりません: ${tabName}`);
        return;
    }
    
    contentElement.classList.remove('hidden');
    tabElement.classList.add('border-blue-600', 'text-blue-600');
    tabElement.classList.remove('border-transparent', 'text-gray-600');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabName === 'events') {
        loadEvents();
    } else if (tabName === 'manage') {
        loadManageEventList();
    }
    
    console.log('タブ切り替え完了:', tabName);
}

// イベント一覧の読み込み
async function loadEvents() {
    try {
        const { collection, getDocs, query, orderBy } = window.firestore;
        const eventsRef = collection(window.db, 'events');
        const q = query(eventsRef, orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const events = [];
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        
        displayEvents(events);
    } catch (error) {
        console.error('イベントの読み込みに失敗しました:', error);
        showNotification('イベントの読み込みに失敗しました', 'error');
    }
}

// イベントの表示
function displayEvents(events) {
    const eventsList = document.getElementById('events-list');
    
    let filteredEvents = events;
    if (currentFilter !== 'all') {
        filteredEvents = events.filter(event => event.status === currentFilter);
    }

    if (filteredEvents.length === 0) {
        eventsList.innerHTML = '<p class="text-gray-500 text-center py-8">イベントがありません</p>';
        return;
    }

    eventsList.innerHTML = filteredEvents.map(event => {
        const datetime = parseDateTime(event.datetime);
        const deadline = parseDateTime(event.deadline);
        const now = new Date();
        const isExpired = deadline < now;

        return `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer" onclick="openEventDetail('${event.id}')">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xl font-bold text-gray-800">${escapeHtml(event.title)}</h3>
                    <span class="px-3 py-1 rounded-full text-sm font-medium ${event.status === 'tentative' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
                        ${event.status === 'tentative' ? '仮スケジュール' : '本スケジュール'}
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div><i class="fas fa-clock mr-2"></i>${formatDateTime(datetime)}</div>
                    <div><i class="fas fa-map-marker-alt mr-2"></i>${escapeHtml(event.location)}</div>
                    <div><i class="fas fa-yen-sign mr-2"></i>${event.cost.toLocaleString()}円</div>
                    <div class="${isExpired ? 'text-red-600 font-medium' : ''}">
                        <i class="fas fa-hourglass-end mr-2"></i>${formatDateTime(deadline)}
                        ${isExpired ? '(期限切れ)' : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// フィルター切り替え
function filterEvents(filter) {
    currentFilter = filter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    event.target.classList.remove('bg-gray-200', 'text-gray-700');
    event.target.classList.add('bg-blue-600', 'text-white');
    
    loadEvents();
}

// イベント作成
async function createEvent() {
    const datetimeValue = document.getElementById('event-datetime').value;
    const deadlineValue = document.getElementById('event-deadline').value;
    
    const eventData = {
        title: document.getElementById('event-title').value,
        datetime: datetimeValue,
        location: document.getElementById('event-location').value,
        cost: parseFloat(document.getElementById('event-cost').value),
        deadline: deadlineValue,
        status: 'tentative',
        description: document.getElementById('event-description').value,
        required_participants: parseInt(document.getElementById('event-required-participants').value) || 0,
        organizer_password: document.getElementById('event-password').value,
        created_at: new Date().toISOString()
    };

    console.log('送信するデータ:', eventData);

    try {
        const { collection, addDoc } = window.firestore;
        const eventsRef = collection(window.db, 'events');
        const docRef = await addDoc(eventsRef, eventData);
        
        console.log('作成成功:', docRef.id);
        showNotification('イベントを作成しました', 'success');
        document.getElementById('create-event-form').reset();
        showTab('events');
    } catch (error) {
        console.error('イベント作成エラー:', error);
        showNotification('イベントの作成に失敗しました: ' + error.message, 'error');
    }
}

// イベント詳細を開く
async function openEventDetail(eventId) {
    try {
        const { doc, getDoc } = window.firestore;
        const eventRef = doc(window.db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (!eventSnap.exists()) {
            showNotification('イベントが見つかりません', 'error');
            return;
        }
        
        const event = { id: eventSnap.id, ...eventSnap.data() };

        document.getElementById('modal-event-title').textContent = event.title;
        document.getElementById('modal-event-datetime').textContent = formatDateTime(parseDateTime(event.datetime));
        document.getElementById('modal-event-location').textContent = event.location;
        document.getElementById('modal-event-cost').textContent = event.cost.toLocaleString() + '円';
        document.getElementById('modal-event-deadline').textContent = formatDateTime(parseDateTime(event.deadline));
        document.getElementById('modal-event-description').textContent = event.description || '説明なし';
        document.getElementById('response-event-id').value = event.id;

        const statusBadge = event.status === 'tentative' 
            ? '<span class="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">仮スケジュール</span>'
            : '<span class="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">本スケジュール</span>';
        document.getElementById('modal-event-status-badge').innerHTML = statusBadge;

        await loadEventResponses(event.id, true);

        document.getElementById('event-detail-modal').classList.remove('hidden');
        document.getElementById('event-detail-modal').classList.add('flex');
    } catch (error) {
        console.error('イベント詳細の読み込みに失敗しました:', error);
        showNotification('イベント詳細の読み込みに失敗しました', 'error');
    }
}

// モーダルを閉じる
function closeModal(event) {
    if (!event || event.target.id === 'event-detail-modal') {
        document.getElementById('event-detail-modal').classList.add('hidden');
        document.getElementById('event-detail-modal').classList.remove('flex');
        document.getElementById('response-form').reset();
    }
}

// 回答を送信
async function submitResponse() {
    const eventId = document.getElementById('response-event-id').value;
    const name = document.getElementById('response-name').value;
    const status = document.querySelector('input[name="response-status"]:checked').value;
    const comment = document.getElementById('response-comment').value;

    const responseData = {
        event_id: eventId,
        participant_name: name,
        response_status: status,
        comment: comment,
        created_at: new Date().toISOString()
    };

    try {
        const { collection, addDoc } = window.firestore;
        const responsesRef = collection(window.db, 'responses');
        await addDoc(responsesRef, responseData);

        showNotification('回答を送信しました', 'success');
        document.getElementById('response-form').reset();
        await loadEventResponses(eventId, true);
    } catch (error) {
        console.error('回答送信エラー:', error);
        showNotification('回答の送信に失敗しました', 'error');
    }
}

// イベントの回答を読み込む
async function loadEventResponses(eventId, isModal = false) {
    try {
        const { collection, query, where, getDocs } = window.firestore;
        const responsesRef = collection(window.db, 'responses');
        const q = query(responsesRef, where('event_id', '==', eventId));
        const querySnapshot = await getDocs(q);
        
        const eventResponses = [];
        querySnapshot.forEach((doc) => {
            eventResponses.push({ id: doc.id, ...doc.data() });
        });

        const attendingList = eventResponses.filter(r => r.response_status === 'attending');
        const notAttendingList = eventResponses.filter(r => r.response_status === 'not_attending');
        const undecidedList = eventResponses.filter(r => r.response_status === 'undecided');

        const counts = {
            attending: attendingList.length,
            not_attending: notAttendingList.length,
            undecided: undecidedList.length
        };

        const prefix = isModal ? 'modal-' : '';
        document.getElementById(`${prefix}count-attending`).textContent = counts.attending;
        document.getElementById(`${prefix}count-not-attending`).textContent = counts.not_attending;
        document.getElementById(`${prefix}count-undecided`).textContent = counts.undecided;

        if (isModal) {
            displayParticipantNames('modal-list-attending', attendingList);
            displayParticipantNames('modal-list-not-attending', notAttendingList);
            displayParticipantNames('modal-list-undecided', undecidedList);
        } else {
            displayParticipantNames('manage-list-attending', attendingList);
            displayParticipantNames('manage-list-not-attending', notAttendingList);
            displayParticipantNames('manage-list-undecided', undecidedList);
            displayResponsesList(eventResponses);
        }
    } catch (error) {
        console.error('回答の読み込みに失敗しました:', error);
    }
}

// 参加者名リストを表示
function displayParticipantNames(elementId, responses) {
    const element = document.getElementById(elementId);
    
    if (responses.length === 0) {
        element.innerHTML = '<span class="text-gray-500">なし</span>';
        return;
    }

    const names = responses.map(r => {
        const hasComment = r.comment && r.comment.trim() !== '';
        const commentIcon = hasComment ? ' <i class="fas fa-comment text-gray-400 text-xs"></i>' : '';
        const commentTitle = hasComment ? escapeHtml(r.comment) : '';
        
        return `
            <span class="inline-block mr-2 mb-1">
                <button 
                    onclick="showEditDeleteMenu('${r.id}', '${escapeHtml(r.participant_name).replace(/'/g, "\\'")}', '${r.response_status}', '${commentTitle.replace(/'/g, "\\'")}', '${r.event_id}')"
                    class="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:border-gray-400 transition text-sm"
                    title="クリックして編集・削除">
                    ${escapeHtml(r.participant_name)}${commentIcon}
                </button>
            </span>
        `;
    }).join('');
    
    element.innerHTML = names;
}

// 編集・削除メニューを表示
function showEditDeleteMenu(responseId, participantName, currentStatus, comment, eventId) {
    const statusText = {
        'attending': '参加',
        'not_attending': '不参加',
        'undecided': '未定'
    };
    
    const currentStatusText = statusText[currentStatus];
    
    const otherStatuses = Object.entries(statusText)
        .filter(([key, value]) => key !== currentStatus)
        .map(([key, value]) => `<button onclick="changeResponseStatus('${responseId}', '${key}', '${eventId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">${value}に変更</button>`)
        .join('');
    
    const commentDisplay = comment ? `<div class="text-xs text-gray-600 mt-1 px-4">コメント: ${comment}</div>` : '';
    
    const menu = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeEditDeleteMenu(event)" id="edit-delete-menu">
            <div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4" onclick="event.stopPropagation()">
                <div class="p-4 border-b">
                    <h3 class="font-bold text-lg">${participantName}</h3>
                    <p class="text-sm text-gray-600">現在: ${currentStatusText}</p>
                    ${commentDisplay}
                </div>
                <div class="py-2">
                    <div class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">回答を変更</div>
                    ${otherStatuses}
                    <div class="border-t my-2"></div>
                    <button onclick="deleteResponse('${responseId}', '${eventId}')" class="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">
                        <i class="fas fa-trash mr-2"></i>削除
                    </button>
                </div>
                <div class="p-3 border-t bg-gray-50">
                    <button onclick="closeEditDeleteMenu()" class="w-full px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                        キャンセル
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', menu);
}

// 編集・削除メニューを閉じる
function closeEditDeleteMenu(event) {
    if (!event || event.target.id === 'edit-delete-menu') {
        const menu = document.getElementById('edit-delete-menu');
        if (menu) {
            menu.remove();
        }
    }
}

// 回答ステータスを変更
async function changeResponseStatus(responseId, newStatus, eventId) {
    try {
        const { doc, getDoc, updateDoc } = window.firestore;
        const responseRef = doc(window.db, 'responses', responseId);
        
        await updateDoc(responseRef, {
            response_status: newStatus
        });
        
        showNotification('回答を変更しました', 'success');
        closeEditDeleteMenu();
        
        await loadEventResponses(eventId, document.getElementById('event-detail-modal').classList.contains('flex'));
        
        if (currentManagingEventId === eventId) {
            await loadEventResponses(eventId, false);
        }
    } catch (error) {
        console.error('回答変更エラー:', error);
        showNotification('回答の変更に失敗しました', 'error');
    }
}

// 回答を削除
async function deleteResponse(responseId, eventId) {
    if (!confirm('この回答を削除してもよろしいですか？')) {
        return;
    }
    
    try {
        const { doc, deleteDoc } = window.firestore;
        const responseRef = doc(window.db, 'responses', responseId);
        await deleteDoc(responseRef);
        
        showNotification('回答を削除しました', 'success');
        closeEditDeleteMenu();
        
        await loadEventResponses(eventId, document.getElementById('event-detail-modal').classList.contains('flex'));
        
        if (currentManagingEventId === eventId) {
            await loadEventResponses(eventId, false);
        }
    } catch (error) {
        console.error('回答削除エラー:', error);
        showNotification('回答の削除に失敗しました', 'error');
    }
}

// 回答リストを表示
function displayResponsesList(responses) {
    const responsesList = document.getElementById('responses-list');
    
    if (responses.length === 0) {
        responsesList.innerHTML = '<p class="text-gray-500 text-center py-4">まだ回答がありません</p>';
        return;
    }

    responsesList.innerHTML = responses.map(response => {
        let statusIcon = '';
        let statusClass = '';
        let statusText = '';

        switch (response.response_status) {
            case 'attending':
                statusIcon = 'fa-check-circle';
                statusClass = 'text-green-600';
                statusText = '参加';
                break;
            case 'not_attending':
                statusIcon = 'fa-times-circle';
                statusClass = 'text-red-600';
                statusText = '不参加';
                break;
            case 'undecided':
                statusIcon = 'fa-question-circle';
                statusClass = 'text-yellow-600';
                statusText = '未定';
                break;
        }

        const commentText = response.comment ? escapeHtml(response.comment) : '';

        return `
            <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-medium">${escapeHtml(response.participant_name)}</div>
                        ${response.comment ? `<div class="text-sm text-gray-600 mt-1">${escapeHtml(response.comment)}</div>` : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="${statusClass}">
                            <i class="fas ${statusIcon} mr-1"></i>${statusText}
                        </span>
                        <button 
                            onclick="showEditDeleteMenu('${response.id}', '${escapeHtml(response.participant_name).replace(/'/g, "\\'")}', '${response.response_status}', '${commentText.replace(/'/g, "\\'")}', '${response.event_id}')"
                            class="text-gray-400 hover:text-gray-600 px-2 py-1"
                            title="編集・削除">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 管理用イベントリストの読み込み
async function loadManageEventList() {
    try {
        const { collection, getDocs, query, orderBy } = window.firestore;
        const eventsRef = collection(window.db, 'events');
        const q = query(eventsRef, orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const events = [];
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        
        const select = document.getElementById('manage-event-select');
        select.innerHTML = '<option value="">-- イベントを選択してください --</option>' +
            events.map(event => {
                const statusLabel = event.status === 'tentative' ? '仮' : '本';
                return `<option value="${event.id}">[${statusLabel}] ${escapeHtml(event.title)} - ${formatDateTime(parseDateTime(event.datetime))}</option>`;
            }).join('');
    } catch (error) {
        console.error('イベントリストの読み込みに失敗しました:', error);
    }
}

// 管理するイベントを選択
function selectEventToManage() {
    const eventId = document.getElementById('manage-event-select').value;
    
    if (eventId) {
        document.getElementById('password-section').classList.remove('hidden');
        document.getElementById('management-panel').classList.add('hidden');
        document.getElementById('manage-password').value = '';
    } else {
        document.getElementById('password-section').classList.add('hidden');
        document.getElementById('management-panel').classList.add('hidden');
    }
}

// 主催者認証
async function authenticateManager() {
    const eventId = document.getElementById('manage-event-select').value;
    const password = document.getElementById('manage-password').value;

    if (!eventId || !password) {
        showNotification('イベントとパスワードを入力してください', 'error');
        return;
    }

    try {
        const { doc, getDoc } = window.firestore;
        const eventRef = doc(window.db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (!eventSnap.exists()) {
            showNotification('イベントが見つかりません', 'error');
            return;
        }
        
        const event = { id: eventSnap.id, ...eventSnap.data() };

        if (event.organizer_password === password) {
            currentManagingEvent = event;
            currentManagingEventId = eventId;
            showManagementPanel(event);
        } else {
            showNotification('パスワードが正しくありません', 'error');
        }
    } catch (error) {
        console.error('認証エラー:', error);
        showNotification('認証に失敗しました', 'error');
    }
}

// 管理パネルを表示
async function showManagementPanel(event) {
    document.getElementById('management-panel').classList.remove('hidden');

    document.getElementById('manage-event-title').textContent = event.title;
    document.getElementById('manage-event-datetime').textContent = formatDateTime(parseDateTime(event.datetime));
    document.getElementById('manage-event-location').textContent = event.location;
    document.getElementById('manage-event-cost').textContent = event.cost.toLocaleString() + '円';
    document.getElementById('manage-event-deadline').textContent = formatDateTime(parseDateTime(event.deadline));
    document.getElementById('manage-event-status').innerHTML = event.status === 'tentative' 
        ? '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">仮スケジュール</span>'
        : '<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">本スケジュール</span>';

    await loadEventResponses(event.id, false);

    if (event.status === 'tentative') {
        document.getElementById('confirm-section').classList.remove('hidden');
        document.getElementById('already-confirmed').classList.add('hidden');
    } else {
        document.getElementById('confirm-section').classList.add('hidden');
        document.getElementById('already-confirmed').classList.remove('hidden');
    }
}

// イベントを本スケジュールに確定
async function confirmEvent() {
    if (!currentManagingEventId || !currentManagingEvent) {
        showNotification('イベントが選択されていません', 'error');
        return;
    }

    if (!confirm('このイベントを本スケジュールとして確定しますか？')) {
        return;
    }

    try {
        const { doc, updateDoc, getDoc } = window.firestore;
        const eventRef = doc(window.db, 'events', currentManagingEventId);
        
        await updateDoc(eventRef, {
            status: 'confirmed'
        });

        showNotification('イベントを本スケジュールとして確定しました', 'success');
        
        const updatedSnap = await getDoc(eventRef);
        const updatedEventData = { id: updatedSnap.id, ...updatedSnap.data() };
        currentManagingEvent = updatedEventData;
        showManagementPanel(updatedEventData);
        loadManageEventList();
    } catch (error) {
        console.error('イベント確定エラー:', error);
        showNotification('イベントの確定に失敗しました', 'error');
    }
}

// 現在のイベントを削除
async function deleteCurrentEvent() {
    if (!currentManagingEventId || !currentManagingEvent) {
        showNotification('イベントが選択されていません', 'error');
        return;
    }

    const eventTitle = currentManagingEvent.title;
    
    if (!confirm(`本当に「${eventTitle}」を削除しますか？\n\nこのイベントに関連するすべての回答も削除されます。\nこの操作は取り消せません。`)) {
        return;
    }

    if (!confirm('最終確認：本当に削除してよろしいですか？')) {
        return;
    }

    try {
        const { collection, query, where, getDocs, doc, deleteDoc } = window.firestore;
        
        // 関連する回答を削除
        const responsesRef = collection(window.db, 'responses');
        const q = query(responsesRef, where('event_id', '==', currentManagingEventId));
        const querySnapshot = await getDocs(q);
        
        const deletePromises = [];
        querySnapshot.forEach((docSnapshot) => {
            deletePromises.push(deleteDoc(doc(window.db, 'responses', docSnapshot.id)));
        });
        await Promise.all(deletePromises);

        // イベントを削除
        const eventRef = doc(window.db, 'events', currentManagingEventId);
        await deleteDoc(eventRef);

        showNotification('イベントを削除しました', 'success');
        
        currentManagingEvent = null;
        currentManagingEventId = null;
        document.getElementById('management-panel').classList.add('hidden');
        document.getElementById('password-section').classList.add('hidden');
        document.getElementById('manage-event-select').value = '';
        
        await loadManageEventList();
        await loadEvents();
    } catch (error) {
        console.error('イベント削除エラー:', error);
        showNotification('イベントの削除に失敗しました', 'error');
    }
}

// 通知を表示
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 日時のフォーマット
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 日時文字列をDateオブジェクトに変換
function parseDateTime(dateString) {
    if (dateString instanceof Date) {
        return dateString;
    }
    if (typeof dateString === 'number') {
        return new Date(dateString);
    }
    return new Date(dateString);
}
