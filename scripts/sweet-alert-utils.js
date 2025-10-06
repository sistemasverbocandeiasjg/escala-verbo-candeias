// scripts/sweet-alert-utils.js - Utilitários para SweetAlert2
class SweetAlertUtils {
    static async confirm(title, text, confirmButtonText = 'Sim', cancelButtonText = 'Não') {
        const result = await Swal.fire({
            title: title,
            text: text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#667eea',
            cancelButtonColor: '#6c757d',
            confirmButtonText: confirmButtonText,
            cancelButtonText: cancelButtonText,
            reverseButtons: true,
            backdrop: true,
            allowOutsideClick: false,
            allowEscapeKey: true,
            customClass: {
                popup: 'sweetalert-custom',
                title: 'sweetalert-title',
                htmlContainer: 'sweetalert-content',
                confirmButton: 'sweetalert-confirm',
                cancelButton: 'sweetalert-cancel'
            }
        });

        return result.isConfirmed;
    }

    static async success(title, text = '', timer = 2000) {
        await Swal.fire({
            title: title,
            text: text,
            icon: 'success',
            timer: timer,
            showConfirmButton: false,
            toast: false,
            position: 'center',
            customClass: {
                popup: 'sweetalert-custom',
                title: 'sweetalert-title',
                htmlContainer: 'sweetalert-content'
            }
        });
    }

    static async error(title, text = '') {
        await Swal.fire({
            title: title,
            text: text,
            icon: 'error',
            confirmButtonColor: '#667eea',
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            customClass: {
                popup: 'sweetalert-custom',
                title: 'sweetalert-title',
                htmlContainer: 'sweetalert-content',
                confirmButton: 'sweetalert-confirm'
            }
        });
    }

    static async warning(title, text = '') {
        await Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            confirmButtonColor: '#667eea',
            confirmButtonText: 'OK',
            customClass: {
                popup: 'sweetalert-custom',
                title: 'sweetalert-title',
                htmlContainer: 'sweetalert-content',
                confirmButton: 'sweetalert-confirm'
            }
        });
    }

    static async info(title, text = '') {
        await Swal.fire({
            title: title,
            text: text,
            icon: 'info',
            confirmButtonColor: '#667eea',
            confirmButtonText: 'OK',
            customClass: {
                popup: 'sweetalert-custom',
                title: 'sweetalert-title',
                htmlContainer: 'sweetalert-content',
                confirmButton: 'sweetalert-confirm'
            }
        });
    }

    static showLoading(title = 'Processando...') {
        Swal.fire({
            title: title,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            },
            customClass: {
                popup: 'sweetalert-custom',
                title: 'sweetalert-title'
            }
        });
    }

    static close() {
        Swal.close();
    }
}

// Exportar para uso global
window.SweetAlert = SweetAlertUtils;