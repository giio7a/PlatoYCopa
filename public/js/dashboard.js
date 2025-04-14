document.addEventListener('DOMContentLoaded', function() {
    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
    
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
      });
    }
    
    if (mobileSidebarToggle) {
      mobileSidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('show');
      });
    }
    
    // Restore sidebar state from localStorage
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
      sidebar.classList.add('collapsed');
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
      if (window.innerWidth <= 992 && 
          sidebar.classList.contains('show') && 
          !sidebar.contains(event.target) && 
          event.target !== mobileSidebarToggle) {
        sidebar.classList.remove('show');
      }
    });
    
    // Dropdown Toggle
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
      toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        const dropdown = this.closest('.dropdown');
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown.active').forEach(activeDropdown => {
          if (activeDropdown !== dropdown) {
            activeDropdown.classList.remove('active');
          }
        });
        
        dropdown.classList.toggle('active');
      });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
      document.querySelectorAll('.dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    });
    
    // Modal functionality
    const modalTriggers = document.querySelectorAll('[data-toggle="modal"]');
    const modalClosers = document.querySelectorAll('[data-dismiss="modal"]');
    
    modalTriggers.forEach(trigger => {
      trigger.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const modal = document.querySelector(targetId);
        
        if (modal) {
          modal.classList.add('show');
          document.body.style.overflow = 'hidden';
        }
      });
    });
    
    modalClosers.forEach(closer => {
      closer.addEventListener('click', function() {
        const modal = this.closest('.modal');
        
        if (modal) {
          modal.classList.remove('show');
          document.body.style.overflow = '';
        }
      });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', function(event) {
        if (event.target === this) {
          this.classList.remove('show');
          document.body.style.overflow = '';
        }
      });
    });
    
    // Toast notifications
    window.showToast = function(options) {
      const { type = 'info', title, message, duration = 5000 } = options;
      
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      let icon = '';
      switch (type) {
        case 'success':
          icon = 'bi-check-circle-fill';
          break;
        case 'error':
          icon = 'bi-x-circle-fill';
          break;
        case 'warning':
          icon = 'bi-exclamation-triangle-fill';
          break;
        default:
          icon = 'bi-info-circle-fill';
      }
      
      toast.innerHTML = `
        <div class="toast-icon">
          <i class="bi ${icon}"></i>
        </div>
        <div class="toast-content">
          <h4 class="toast-title">${title}</h4>
          <p class="toast-message">${message}</p>
        </div>
        <button class="toast-close">
          <i class="bi bi-x"></i>
        </button>
      `;
      
      const toastContainer = document.querySelector('.toast-container');
      toastContainer.appendChild(toast);
      
      // Show toast with animation
      setTimeout(() => {
        toast.classList.add('show');
      }, 10);
      
      // Close toast when clicking the close button
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.remove();
        }, 300);
      });
      
      // Auto close after duration
      if (duration) {
        setTimeout(() => {
          if (document.body.contains(toast)) {
            toast.classList.remove('show');
            setTimeout(() => {
              toast.remove();
            }, 300);
          }
        }, duration);
      }
    };
    
    // Form validation
    const forms = document.querySelectorAll('.needs-validation');
    
    forms.forEach(form => {
      form.addEventListener('submit', function(event) {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        
        form.classList.add('was-validated');
      });
    });
    
    // Data tables functionality
    initDataTables();
    
    // Initialize CRUD operations
    initCrudOperations();
  });
  
  // Data Tables functionality
  function initDataTables() {
    const dataTables = document.querySelectorAll('.data-table');
    
    dataTables.forEach(table => {
      const searchInput = table.closest('.card').querySelector('.table-search');
      
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          const searchTerm = this.value.toLowerCase();
          const rows = table.querySelectorAll('tbody tr');
          
          rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
          });
        });
      }
      
      // Sorting functionality
      const headers = table.querySelectorAll('th[data-sort]');
      
      headers.forEach(header => {
        header.addEventListener('click', function() {
          const column = this.getAttribute('data-sort');
          const direction = this.classList.contains('sort-asc') ? 'desc' : 'asc';
          
          // Reset all headers
          headers.forEach(h => {
            h.classList.remove('sort-asc', 'sort-desc');
          });
          
          this.classList.add(`sort-${direction}`);
          
          const rows = Array.from(table.querySelectorAll('tbody tr'));
          const sortedRows = rows.sort((a, b) => {
            const aValue = a.querySelector(`td[data-column="${column}"]`).textContent;
            const bValue = b.querySelector(`td[data-column="${column}"]`).textContent;
            
            if (direction === 'asc') {
              return aValue.localeCompare(bValue);
            } else {
              return bValue.localeCompare(aValue);
            }
          });
          
          const tbody = table.querySelector('tbody');
          tbody.innerHTML = '';
          
          sortedRows.forEach(row => {
            tbody.appendChild(row);
          });
        });
      });
    });
  }
  
  // CRUD Operations
  function initCrudOperations() {
    // Delete confirmation
    const deleteButtons = document.querySelectorAll('.btn-delete');
    
    deleteButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        
        const itemId = this.getAttribute('data-id');
        const itemType = this.getAttribute('data-type');
        const itemName = this.getAttribute('data-name');
        
        const modal = document.getElementById('baseModal');
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        const confirmButton = modal.querySelector('#modalConfirm');
        
        modalTitle.textContent = 'Confirmar Eliminación';
        modalBody.innerHTML = `
          <p>¿Estás seguro de que deseas eliminar ${itemType} <strong>${itemName}</strong>?</p>
          <p class="text-danger">Esta acción no se puede deshacer.</p>
        `;
        
        confirmButton.className = 'btn btn-danger';
        confirmButton.textContent = 'Eliminar';
        
        // Show modal
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Set up confirm button action
        confirmButton.onclick = function() {
          // Send delete request
          fetch(`/api/${itemType}/${itemId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              // Remove item from DOM
              const row = button.closest('tr');
              if (row) {
                row.remove();
              }
              
              // Show success toast
              window.showToast({
                type: 'success',
                title: 'Eliminado correctamente',
                message: `${itemType} ha sido eliminado.`
              });
            } else {
              // Show error toast
              window.showToast({
                type: 'error',
                title: 'Error',
                message: data.message || 'No se pudo eliminar el elemento.'
              });
            }
            
            // Close modal
            modal.classList.remove('show');
            document.body.style.overflow = '';
          })
          .catch(error => {
            console.error('Error:', error);
            
            // Show error toast
            window.showToast({
              type: 'error',
              title: 'Error',
              message: 'Ocurrió un error al procesar la solicitud.'
            });
            
            // Close modal
            modal.classList.remove('show');
            document.body.style.overflow = '';
          });
        };
      });
    });
    
    // Form submission for create/edit
    const crudForms = document.querySelectorAll('.crud-form');
    
    crudForms.forEach(form => {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const itemType = this.getAttribute('data-type');
        const itemId = this.getAttribute('data-id');
        const isEdit = !!itemId;
        
        const url = isEdit ? `/api/${itemType}/${itemId}` : `/api/${itemType}`;
        const method = isEdit ? 'PUT' : 'POST';
        
        fetch(url, {
          method: method,
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Show success toast
            window.showToast({
              type: 'success',
              title: isEdit ? 'Actualizado correctamente' : 'Creado correctamente',
              message: isEdit ? `${itemType} ha sido actualizado.` : `${itemType} ha sido creado.`
            });
            
            // Redirect or reload
            if (this.getAttribute('data-redirect') === 'true') {
              window.location.href = `/dashboard/${itemType}`;
            } else {
              window.location.reload();
            }
          } else {
            // Show error toast
            window.showToast({
              type: 'error',
              title: 'Error',
              message: data.message || 'No se pudo procesar la solicitud.'
            });
          }
        })
        .catch(error => {
          console.error('Error:', error);
          
          // Show error toast
          window.showToast({
            type: 'error',
            title: 'Error',
            message: 'Ocurrió un error al procesar la solicitud.'
          });
        });
      });
    });
  }