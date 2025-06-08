$(function() {
  const STORAGE_KEY = 'tasks';

  let tasks = [];
  let editingTaskId = null;
  let taskToDeleteId = null;

  // Элементы
  const $tasksContainer = $('#tasksContainer');
  const $taskModal = $('#taskModal');
  const $confirmModal = $('#confirmModal');
  const $taskForm = $('#taskForm');
  const $modalTitle = $('#modalTitle');
  const $taskId = $('#taskId');
  const $taskTitle = $('#taskTitle');
  const $taskDescription = $('#taskDescription');
  const $taskPriority = $('#taskPriority');
  const $taskDueDate = $('#taskDueDate');
  const $taskCompleted = $('#taskCompleted');
  const $searchInput = $('#searchInput');
  const $filterSelect = $('#filterSelect');

  // Загрузить задачи из localStorage
  function loadTasks() {
    const saved = localStorage.getItem(STORAGE_KEY);
    tasks = saved ? JSON.parse(saved) : [];
  }

  // Сохранить задачи в localStorage
  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // Отрисовать задачи с учетом фильтров и поиска
  function renderTasks() {
    const search = $searchInput.val().toLowerCase();
    const filter = $filterSelect.val();

    let filtered = tasks.filter(task => {
      // Поиск по названию и описанию
      const matchesSearch = task.title.toLowerCase().includes(search) || (task.description && task.description.toLowerCase().includes(search));

      // Фильтр по статусу и приоритету
      let matchesFilter = false;
      switch(filter) {
        case 'all': matchesFilter = true; break;
        case 'completed': matchesFilter = task.completed === true; break;
        case 'active': matchesFilter = task.completed === false; break;
        case 'high': matchesFilter = task.priority === 'high'; break;
        case 'medium': matchesFilter = task.priority === 'medium'; break;
        case 'low': matchesFilter = task.priority === 'low'; break;
        default: matchesFilter = true;
      }

      return matchesSearch && matchesFilter;
    });

    // Сортировка по дате создания (новые сверху)
    filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    $tasksContainer.empty();

    if (filtered.length === 0) {
      $tasksContainer.html('<p style="text-align:center; color:#666;">Задачи не найдены.</p>');
      return;
    }

    filtered.forEach(task => {
      const overdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date(new Date().toDateString());
      const $taskDiv = $('<div>').addClass('task').attr('data-id', task.id);
      if (task.completed) $taskDiv.addClass('completed');
      if (overdue) $taskDiv.addClass('overdue');

      const $info = $('<div>').addClass('task-info');
      const $title = $('<div>').addClass('task-title').text(task.title);
      const $desc = $('<div>').addClass('task-description').text(task.description || '');
      const $meta = $('<div>').addClass('task-meta').html(
        `Приоритет: <strong>${task.priority}</strong> | Срок: <strong>${task.dueDate || '-'}</strong> | Статус: <strong>${task.completed ? 'Выполнена' : 'Активна'}</strong>`
      );

      $info.append($title, $desc, $meta);

      const $actions = $('<div>').addClass('task-actions');
      const $editBtn = $('<button>').text('Редактировать').on('click', () => openEditModal(task.id));
      const $deleteBtn = $('<button>').text('Удалить').on('click', () => openConfirmModal(task.id));

      $actions.append($editBtn, $deleteBtn);

      $taskDiv.append($info, $actions);
      $tasksContainer.append($taskDiv);
    });
  }

  // Открыть модальное окно для добавления задачи
  function openAddModal() {
    editingTaskId = null;
    $modalTitle.text('Новая задача');
    $taskForm[0].reset();
    $taskId.val('');
    $taskCompleted.prop('checked', false);
    $taskModal.show();
    $taskTitle.focus();
  }

  // Открыть модальное окно для редактирования задачи
  function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editingTaskId = id;
    $modalTitle.text('Редактировать задачу');
    $taskId.val(task.id);
    $taskTitle.val(task.title);
    $taskDescription.val(task.description);
    $taskPriority.val(task.priority);
    $taskDueDate.val(task.dueDate || '');
    $taskCompleted.prop('checked', task.completed);
    $taskModal.show();
    $taskTitle.focus();
  }

  // Закрыть модальные окна
  function closeModal() {
    $taskModal.hide();
    $confirmModal.hide();
  }

  // Открыть окно подтверждения удаления
  function openConfirmModal(id) {
    taskToDeleteId = id;
    $('#confirmMessage').text('Вы уверены, что хотите удалить эту задачу?');
    $confirmModal.show();
  }

  // Удалить задачу
  function deleteTask() {
    if (!taskToDeleteId) return;
    tasks = tasks.filter(t => t.id !== taskToDeleteId);
    saveTasks();
    renderTasks();
    taskToDeleteId = null;
    closeModal();
    toastr.success('Задача удалена');
  }

  // Добавить или обновить задачу
  function saveTask(e) {
    e.preventDefault();

    const id = $taskId.val();
    const title = $taskTitle.val().trim();
    if (!title) {
      toastr.error('Название задачи обязательно');
      $taskTitle.focus();
      return;
    }

    const taskData = {
      id: id || Date.now().toString(),
      title,
      description: $taskDescription.val().trim(),
      priority: $taskPriority.val(),
      dueDate: $taskDueDate.val() || null,
      completed: $taskCompleted.prop('checked'),
      createdAt: id ? tasks.find(t => t.id === id).createdAt : new Date().toISOString()
    };

    if (id) {
      tasks = tasks.map(t => t.id === id ? taskData : t);
      toastr.success('Задача обновлена');
    } else {
      tasks.push(taskData);
      toastr.success('Задача добавлена');
    }

    saveTasks();
    renderTasks();
    closeModal();
  }

  // Очистить выполненные задачи
  function clearCompleted() {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
      toastr.info('Выполненных задач нет');
      return;
    }
    if (!confirm(`Удалить все ${completedCount} выполненных задач?`)) return;
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    renderTasks();
    toastr.success('Выполненные задачи удалены');
  }

  // Обработчики событий
  $('#addTaskBtn').on('click', openAddModal);
  $('.close').on('click', closeModal);
  $taskForm.on('submit', saveTask);
  $('#confirmYes').on('click', deleteTask);
  $('#confirmNo').on('click', closeModal);
  $searchInput.on('input', renderTasks);
  $filterSelect.on('change', renderTasks);
  $('#clearCompleted').on('click', clearCompleted);

  // Закрыть модал по клику вне контента
  $('.modal').on('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Инициализация
  loadTasks();
  renderTasks();
});