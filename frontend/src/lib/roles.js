export function rutaInicioPorRol(rol) {
  switch (rol) {
    case 'super_admin':
      return '/admin';
    case 'vendedor':
      return '/vendedor';
    case 'cliente':
      return '/cliente';
    default:
      return '/login';
  }
}

export const ETIQUETA_ROL = {
  super_admin: 'Super Admin',
  vendedor: 'Vendedor',
  cliente: 'Cliente',
};
