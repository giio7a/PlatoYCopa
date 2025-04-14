document.addEventListener('DOMContentLoaded', function() {
    // --- CONFIGURACIÓN DE TOAST ---
    // Crear contenedor de toast si no existe
    if (!document.querySelector('.toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Función para mostrar notificaciones toast
    window.showToast = function({ type, title, message, duration = 5000 }) {
      // Crear elemento toast
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.style.transform = 'translateX(100%)';
      
      // Crear contenido del toast
      let iconClass = '';
      let iconColor = '';
      let borderColor = '';
      
      if (type === 'success') {
        iconClass = 'bi-check-circle-fill';
        iconColor = '#28a745';
        borderColor = '#28a745';
      } else if (type === 'error') {
        iconClass = 'bi-x-circle-fill';
        iconColor = '#dc3545';
        borderColor = '#dc3545';
      } else if (type === 'warning') {
        iconClass = 'bi-exclamation-triangle-fill';
        iconColor = '#ffc107';
        borderColor = '#ffc107';
      } else if (type === 'info') {
        iconClass = 'bi-info-circle-fill';
        iconColor = '#17a2b8';
        borderColor = '#17a2b8';
      }
      
      toast.style.borderLeftColor = borderColor;
      
      toast.innerHTML = `
        <div class="toast-header">
          <i class="toast-icon bi ${iconClass}" style="color: ${iconColor}"></i>
          <strong class="toast-title">${title}</strong>
          <button type="button" class="btn-close">×</button>
        </div>
        <div class="toast-body">${message}</div>
      `;
      
      // Agregar al contenedor
      const toastContainer = document.querySelector('.toast-container');
      toastContainer.appendChild(toast);
      
      // Animar entrada
      setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.classList.add('show');
      }, 10);
      
      // Configurar cierre automático
      const timeout = setTimeout(() => {
        closeToast(toast);
      }, duration);
      
      // Configurar botón de cierre
      toast.querySelector('.btn-close').addEventListener('click', () => {
        clearTimeout(timeout);
        closeToast(toast);
      });
      
      function closeToast(toastElement) {
        toastElement.style.transform = 'translateX(100%)';
        toastElement.style.opacity = '0';
        setTimeout(() => {
          toastElement.remove();
        }, 300);
      }
    };
    
    // --- FUNCIONES DE MODAL ---
    // Función para mostrar modales de éxito y error
    window.showSuccessModal = function(message) {
      document.getElementById('successMessage').textContent = message;
      openModal('successModal');
    }
    
    window.showErrorModal = function(message) {
      document.getElementById('errorMessage').textContent = message;
      openModal('errorModal');
    }
    
    // Función para abrir modales
    window.openModal = function(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        // Log para depuración
        console.log(`Modal abierto: ${modalId}`);
      } else {
        console.error(`Modal no encontrado: ${modalId}`);
      }
    }
    
    // Función para cerrar modales
    window.closeModal = function(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
      }
    }
    
    // Abrir modal con delegación de eventos para mejor rendimiento
    document.addEventListener('click', function(e) {
      // Botones de apertura de modal
      if (e.target.matches('[data-toggle="modal"], [data-toggle="modal"] *')) {
        e.preventDefault();
        const button = e.target.closest('[data-toggle="modal"]');
        if (button) {
          const targetModal = button.getAttribute('data-target');
          console.log('Abriendo modal:', targetModal);
          openModal(targetModal);
        }
      }
      
      // Botones de cierre de modal
      if (e.target.matches('[data-dismiss="modal"], [data-dismiss="modal"] *')) {
        e.preventDefault();
        const button = e.target.closest('[data-dismiss="modal"]');
        if (button) {
          const modal = button.closest('.modal');
          if (modal) {
            const modalId = modal.getAttribute('id');
            closeModal(modalId);
          }
        }
      }
      
      // Cerrar modal al hacer clic fuera del contenido
      if (e.target.classList.contains('modal') && e.target.classList.contains('show')) {
        const modalId = e.target.getAttribute('id');
        closeModal(modalId);
      }
      
      // --- MANEJO DE ELIMINAR MIEMBRO ---
      // Botones de eliminar
      if (e.target.matches('.delete-member, .delete-member *')) {
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.target.closest('.delete-member');
        if (button) {
          const memberId = button.getAttribute('data-id');
          const memberCard = button.closest('[data-id]');
          const memberName = memberCard.querySelector('.team-member-name').textContent;
          
          console.log('Preparando eliminación de miembro:', memberId, memberName);
          
          // Llenar modal de confirmación
          document.getElementById('deleteMemberId').value = memberId;
          document.getElementById('deleteMemberName').textContent = memberName;
          
          // Abrir modal
          openModal('confirmDeleteModal');
        }
      }
    });
    
    // Configurar el botón de confirmación de eliminación
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', function() {
        const memberId = document.getElementById('deleteMemberId').value;
        
        if (!memberId) {
          console.error('ID de miembro no encontrado');
          return;
        }
        
        // Mostrar indicador de carga
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="bi bi-arrow-repeat"></i> Eliminando...';
        this.disabled = true;
        
        console.log('Enviando solicitud para eliminar miembro:', memberId);
        
        // Enviar solicitud para eliminar miembro
        fetch(`/dashboard/personal/api/miembros/${memberId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(response => response.json())
        .then(data => {
          // Restaurar botón
          this.innerHTML = originalText;
          this.disabled = false;
          
          if (data.success) {
            // Cerrar modal
            closeModal('confirmDeleteModal');
            
            // Mostrar mensaje de éxito
            showSuccessModal('Miembro del equipo eliminado correctamente.');
            
            // Recargar la página para actualizar la lista
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            // Cerrar modal de confirmación
            closeModal('confirmDeleteModal');
            
            // Mostrar mensaje de error
            showErrorModal(data.message || 'No se pudo eliminar el miembro del equipo.');
          }
        })
        .catch(error => {
          // Restaurar botón
          this.innerHTML = originalText;
          this.disabled = false;
          
          console.error('Error:', error);
          
          // Cerrar modal de confirmación
          closeModal('confirmDeleteModal');
          
          showErrorModal('Ocurrió un error al procesar la solicitud.');
        });
      });
    }
    
    // --- TOGGLE VISTA GRID/LIST ---
    const viewButtons = document.querySelectorAll('.view-toggle .btn-icon');
    const teamContainer = document.getElementById('teamContainer');
    
    viewButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Desactivar todos los botones
        viewButtons.forEach(btn => btn.classList.remove('active'));
        // Activar el botón actual
        this.classList.add('active');
        
        const viewType = this.getAttribute('data-view');
        const teamCards = document.querySelectorAll('[data-id]');
        
        // Primero, eliminar todas las clases relacionadas con la vista
        teamContainer.classList.remove('team-grid', 'team-list');
        teamCards.forEach(card => {
          card.classList.remove('team-card', 'team-list-item');
        });
        
        // Luego, aplicar las clases correspondientes a la vista seleccionada
        if (viewType === 'grid') {
          teamContainer.classList.add('team-grid');
          teamCards.forEach(card => {
            card.classList.add('team-card');
          });
        } else if (viewType === 'list') {
          teamContainer.classList.add('team-list');
          teamCards.forEach(card => {
            card.classList.add('team-list-item');
          });
        }
      });
    });
    
    // --- MANEJO DE DROPDOWNS ---
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
      toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        const dropdown = this.closest('.dropdown');
        
        // Cerrar otros dropdowns
        dropdownToggles.forEach(otherToggle => {
          const otherDropdown = otherToggle.closest('.dropdown');
          if (otherDropdown !== dropdown) {
            otherDropdown.classList.remove('active');
          }
        });
        
        // Toggle el dropdown actual
        dropdown.classList.toggle('active');
      });
    });
    
    // Cerrar dropdowns al hacer clic fuera
    document.addEventListener('click', function() {
      dropdownToggles.forEach(toggle => {
        toggle.closest('.dropdown').classList.remove('active');
      });
    });
    
    // --- FILTRAR MIEMBROS ---
    const filterItems = document.querySelectorAll('[data-filter]');
    const searchInput = document.getElementById('searchMember');
    
    filterItems.forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Desactivar todos los filtros
        filterItems.forEach(filter => filter.classList.remove('active'));
        // Activar el filtro actual
        this.classList.add('active');
        
        const filter = this.getAttribute('data-filter');
        const members = document.querySelectorAll('[data-id]');
        
        members.forEach(member => {
          if (filter === 'all') {
            member.style.display = '';
          } else {
            const posicion = member.getAttribute('data-posicion');
            if (posicion === filter) {
              member.style.display = '';
            } else {
              member.style.display = 'none';
            }
          }
        });
      });
    });
    
    // --- BÚSQUEDA EN TIEMPO REAL ---
    if (searchInput) {
      // Debounce para mejorar rendimiento
      let searchTimeout;
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
          const searchTerm = this.value.toLowerCase();
          const members = document.querySelectorAll('[data-id]');
          
          members.forEach(member => {
            const name = member.querySelector('.team-member-name').textContent.toLowerCase();
            const position = member.querySelector('.team-member-position').textContent.toLowerCase();
            const description = member.querySelector('.team-member-description')?.textContent.toLowerCase() || '';
            
            if (name.includes(searchTerm) || position.includes(searchTerm) || description.includes(searchTerm)) {
              member.style.display = '';
            } else {
              member.style.display = 'none';
            }
          });
        }, 300);
      });
    }
    
    // --- ORDENAR MIEMBROS ---
    const sortItems = document.querySelectorAll('[data-sort]');
    
    sortItems.forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Desactivar todos los ordenamientos
        sortItems.forEach(sort => sort.classList.remove('active'));
        // Activar el ordenamiento actual
        this.classList.add('active');
        
        const sort = this.getAttribute('data-sort');
        const members = Array.from(document.querySelectorAll('[data-id]'));
        
        members.sort((a, b) => {
          if (sort === 'orden') {
            const orderA = parseInt(a.querySelector('.order-badge').textContent, 10);
            const orderB = parseInt(b.querySelector('.order-badge').textContent, 10);
            return orderA - orderB;
          } else if (sort === 'nombre') {
            const nameA = a.querySelector('.team-member-name').textContent;
            const nameB = b.querySelector('.team-member-name').textContent;
            return nameA.localeCompare(nameB);
          } else if (sort === 'cargo') {
            const positionA = a.querySelector('.team-member-position').textContent;
            const positionB = b.querySelector('.team-member-position').textContent;
            return positionA.localeCompare(positionB);
          } else if (sort === 'reciente') {
            const idA = parseInt(a.getAttribute('data-id'), 10);
            const idB = parseInt(b.getAttribute('data-id'), 10);
            return idB - idA;
          }
          return 0;
        });
        
        const container = document.getElementById('teamContainer');
        members.forEach(member => container.appendChild(member));
      });
    });
    
    // --- PREVISUALIZACIÓN DE IMÁGENES ---
    // Previsualizar imagen en formulario de añadir
    const fotoInput = document.getElementById('foto');
    const photoPreview = document.getElementById('photoPreview');
    const photoPlaceholder = document.getElementById('photoPlaceholder');
    
    if (fotoInput) {
      fotoInput.addEventListener('change', function() {
        const file = this.files[0];
        
        if (file) {
          const reader = new FileReader();
          
          reader.onload = function(e) {
            photoPreview.src = e.target.result;
            photoPreview.style.display = 'block';
            photoPlaceholder.style.display = 'none';
          };
          
          reader.readAsDataURL(file);
          
          // Actualizar el texto del label
          const label = this.nextElementSibling;
          label.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
        }
      });
    }
    
    // Previsualizar imagen en formulario de editar
    const editFotoInput = document.getElementById('edit_foto');
    const editPhotoPreview = document.getElementById('edit_photoPreview');
    const editPhotoPlaceholder = document.getElementById('edit_photoPlaceholder');
    
    if (editFotoInput) {
      editFotoInput.addEventListener('change', function() {
        const file = this.files[0];
        
        if (file) {
          const reader = new FileReader();
          
          reader.onload = function(e) {
            editPhotoPreview.src = e.target.result;
            editPhotoPreview.style.display = 'block';
            editPhotoPlaceholder.style.display = 'none';
          };
          
          reader.readAsDataURL(file);
          
          // Actualizar el texto del label
          const label = this.nextElementSibling;
          label.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
        }
      });
    }
    
    // --- AÑADIR MIEMBRO ---
    const addMemberForm = document.getElementById('addMemberForm');
    
    if (addMemberForm) {
      addMemberForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!this.checkValidity()) {
          e.stopPropagation();
          this.classList.add('was-validated');
          return;
        }
        
        // Crear FormData para enviar los datos incluyendo la imagen
        const formData = new FormData(this);
        
        // Validar que el orden no sea negativo
        const orden = parseInt(formData.get('orden'), 10);
        if (orden < 0) {
          formData.set('orden', '0');
        }
        
        // Recopilar datos de redes sociales
        const socialData = {
          facebook: formData.get('facebook') || '',
          instagram: formData.get('instagram') || '',
          twitter: formData.get('twitter') || '',
          linkedin: formData.get('linkedin') || ''
        };
        
        // Añadir redes sociales como JSON
        formData.delete('facebook');
        formData.delete('instagram');
        formData.delete('twitter');
        formData.delete('linkedin');
        formData.append('redes_sociales', JSON.stringify(socialData));
        
        // Mostrar indicador de carga
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Guardando...';
        submitBtn.disabled = true;
        
        // Enviar solicitud para crear miembro
        fetch('/dashboard/personal/api/miembros', {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          // Restaurar botón
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          
          if (data.success) {
            // Cerrar modal
            closeModal('addMemberModal');
            
            // Mostrar mensaje de éxito
            showSuccessModal('Miembro del equipo añadido correctamente.');
            
            // Recargar la página para mostrar el nuevo miembro
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            // Mostrar mensaje de error
            showErrorModal(data.message || 'No se pudo añadir el miembro del equipo.');
          }
        })
        .catch(error => {
          // Restaurar botón
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          
          console.error('Error:', error);
          showErrorModal('Ocurrió un error al procesar la solicitud.');
        });
      });
    }
    
    // --- EDITAR MIEMBRO ---
    const editButtons = document.querySelectorAll('.edit-member');
    const editMemberForm = document.getElementById('editMemberForm');
    
    editButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        const memberId = this.getAttribute('data-id');
        
        // Mostrar indicador de carga
        this.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
        this.disabled = true;
        
        // Obtener datos del miembro
        fetch(`/dashboard/personal/api/miembros/${memberId}`)
          .then(response => response.json())
          .then(data => {
            // Restaurar botón
            this.innerHTML = '<i class="bi bi-pencil"></i>';
            this.disabled = false;
            
            if (data.success) {
              const miembro = data.miembro;
              console.log("Datos del miembro:", miembro);
              
              // Llenar formulario con mapeo correcto de campos
              document.getElementById('edit_id').value = miembro.id;
              document.getElementById('edit_nombre').value = miembro.nombre || '';
              document.getElementById('edit_cargo').value = miembro.posicion || miembro.cargo || '';
              document.getElementById('edit_descripcion').value = miembro.bio || miembro.descripcion || '';
              document.getElementById('edit_orden').value = miembro.orden || 0;
              
              // Actualizar la imagen de perfil si existe
              if (miembro.imagen) {
                document.getElementById('edit_photoPreview').src = miembro.imagen;
                document.getElementById('edit_photoPreview').style.display = 'block';
                document.getElementById('edit_photoPlaceholder').style.display = 'none';
              } else {
                document.getElementById('edit_photoPreview').style.display = 'none';
                document.getElementById('edit_photoPlaceholder').style.display = 'flex';
              }
              
              // Llenar redes sociales
              try {
                const redesSociales = typeof miembro.redes_sociales === 'string' 
                  ? JSON.parse(miembro.redes_sociales || '{}')
                  : miembro.redes_sociales || {};
                  
                document.getElementById('edit_facebook').value = redesSociales.facebook || '';
                document.getElementById('edit_instagram').value = redesSociales.instagram || '';
                document.getElementById('edit_twitter').value = redesSociales.twitter || '';
                document.getElementById('edit_linkedin').value = redesSociales.linkedin || '';
              } catch (error) {
                console.error('Error al parsear redes sociales:', error);
              }
              
              // Abrir modal
              openModal('editMemberModal');
            } else {
              showErrorModal(data.message || 'No se pudo obtener la información del miembro.');
            }
          })
          .catch(error => {
            // Restaurar botón
            this.innerHTML = '<i class="bi bi-pencil"></i>';
            this.disabled = false;
            
            console.error('Error:', error);
            showErrorModal('Ocurrió un error al obtener la información del miembro.');
          });
      });
    });
    
    if (editMemberForm) {
      editMemberForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!this.checkValidity()) {
          e.stopPropagation();
          this.classList.add('was-validated');
          return;
        }
        
        const memberId = document.getElementById('edit_id').value;
        
        // Crear FormData para enviar los datos incluyendo la imagen
        const formData = new FormData(this);
        
        // Validar que el orden no sea negativo
        const orden = parseInt(formData.get('orden'), 10);
        if (orden < 0) {
          formData.set('orden', '0');
        }
        
        // Recopilar datos de redes sociales
        const socialData = {
          facebook: formData.get('facebook') || '',
          instagram: formData.get('instagram') || '',
          twitter: formData.get('twitter') || '',
          linkedin: formData.get('linkedin') || ''
        };
        
        // Añadir redes sociales como JSON
        formData.delete('facebook');
        formData.delete('instagram');
        formData.delete('twitter');
        formData.delete('linkedin');
        formData.append('redes_sociales', JSON.stringify(socialData));
        
        // Mostrar indicador de carga
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Guardando...';
        submitBtn.disabled = true;
        
        console.log('Enviando datos para actualizar miembro:', {
          id: memberId,
          nombre: formData.get('nombre'),
          cargo: formData.get('cargo'),
          descripcion: formData.get('descripcion'),
          orden: formData.get('orden'),
          foto: formData.get('foto') ? 'Sí' : 'No',
          redes_sociales: JSON.stringify(socialData)
        });
        
        // Enviar solicitud para actualizar miembro
        fetch(`/dashboard/personal/api/miembros/${memberId}`, {
          method: 'PUT',
          body: formData
        })
        .then(response => {
          console.log('Respuesta del servidor:', response.status);
          return response.json();
        })
        .then(data => {
          // Restaurar botón
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          
          if (data.success) {
            // Cerrar modal
            closeModal('editMemberModal');
            
            // Mostrar mensaje de éxito
            showSuccessModal('Miembro del equipo actualizado correctamente.');
            
            // Recargar la página para mostrar los cambios
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            // Mostrar mensaje de error
            showErrorModal(data.message || 'No se pudo actualizar el miembro del equipo.');
          }
        })
        .catch(error => {
          // Restaurar botón
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          
          console.error('Error:', error);
          showErrorModal('Ocurrió un error al procesar la solicitud.');
        });
      });
    }
    
    // --- BOTONES DE CAMBIO DE ORDEN ---
    // Delegación de eventos para botones de orden
    document.addEventListener('click', function(e) {
      // Manejar botón subir
      if (e.target.matches('.move-up, .move-up *')) {
        e.preventDefault();
        const button = e.target.closest('.move-up');
        if (button) {
          const memberId = button.getAttribute('data-id');
          const memberCard = button.closest('[data-id]');
          const currentOrder = parseInt(memberCard.querySelector('.order-badge').textContent, 10);
          
          // No permitir orden negativo
          if (currentOrder <= 0) {
            window.showToast({
              type: 'warning',
              title: 'Aviso',
              message: 'El orden no puede ser menor que 0.'
            });
            return;
          }
          
          const newOrder = currentOrder - 1;
          updateMemberOrder(memberId, newOrder, button);
        }
      }
      
      // Manejar botón bajar
      if (e.target.matches('.move-down, .move-down *')) {
        e.preventDefault();
        const button = e.target.closest('.move-down');
        if (button) {
          const memberId = button.getAttribute('data-id');
          const memberCard = button.closest('[data-id]');
          const currentOrder = parseInt(memberCard.querySelector('.order-badge').textContent, 10);
          const newOrder = currentOrder + 1;
          
          updateMemberOrder(memberId, newOrder, button);
        }
      }
    });
    
    function updateMemberOrder(memberId, newOrder, buttonElement) {
      // Mostrar indicador de carga
      const originalHTML = buttonElement.innerHTML;
      buttonElement.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
      buttonElement.disabled = true;
      
      fetch(`/dashboard/personal/api/miembros/${memberId}/orden`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orden: newOrder })
      })
      .then(response => response.json())
      .then(data => {
        // Restaurar botón
        buttonElement.innerHTML = originalHTML;
        buttonElement.disabled = false;
        
        if (data.success) {
          // Mostrar mensaje de éxito
          window.showToast({
            type: 'success',
            title: 'Éxito',
            message: 'Orden actualizado correctamente.'
          });
          
          // Actualizar el número de orden en la interfaz
          const orderBadge = buttonElement.closest('[data-id]').querySelector('.order-badge');
          orderBadge.textContent = newOrder;
          
          // Aplicar animación de actualización
          orderBadge.style.transform = 'scale(1.2)';
          setTimeout(() => {
            orderBadge.style.transform = 'scale(1)';
          }, 300);
        } else {
          // Mostrar mensaje de error
          window.showToast({
            type: 'error',
            title: 'Error',
            message: data.message || 'No se pudo actualizar el orden.'
          });
        }
      })
      .catch(error => {
        // Restaurar botón
        buttonElement.innerHTML = originalHTML;
        buttonElement.disabled = false;
        
        console.error('Error:', error);
        window.showToast({
          type: 'error',
          title: 'Error',
          message: 'Ocurrió un error al procesar la solicitud.'
        });
      });
    }
    
    // --- AJUSTES RESPONSIVOS ---
    // Función para ajustar elementos según el tamaño de pantalla
    function adjustResponsiveElements() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isLandscape = width > height;
      
      // Ajustar altura de modales en landscape
      if (isLandscape && width <= 992) {
        const modalBodies = document.querySelectorAll('.modal-body');
        modalBodies.forEach(body => {
          body.style.maxHeight = (height - 180) + 'px';
        });
      } else {
        const modalBodies = document.querySelectorAll('.modal-body');
        modalBodies.forEach(body => {
          body.style.maxHeight = '';
        });
      }
      
      // Ajustar tamaño de botones en móvil
      if (width <= 576) {
        document.querySelectorAll('.btn-icon').forEach(btn => {
          btn.style.width = '44px';
          btn.style.height = '44px';
        });
      } else {
        document.querySelectorAll('.btn-icon').forEach(btn => {
          btn.style.width = '';
          btn.style.height = '';
        });
      }
    }
    
    // Ejecutar al cargar
    adjustResponsiveElements();
    
    // Ejecutar al cambiar tamaño o orientación
    window.addEventListener('resize', adjustResponsiveElements);
    window.addEventListener('orientationchange', adjustResponsiveElements);
});