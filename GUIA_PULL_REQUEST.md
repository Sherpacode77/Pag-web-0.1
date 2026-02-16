# 📝 Guía: Cómo Hacer un Pull Request

Esta guía te explica fácilmente cómo subir tus cambios al proyecto usando **Pull Requests (PR)**.

---

## ¿Qué es un Pull Request?

Un **Pull Request** es una solicitud para integrar tus cambios en la rama `main` del proyecto. Antes de ser integrados, tus cambios son **revisados** para asegurar que todo está correcto.

### ¿Por qué es importante?
✅ Mantiene el código limpio y sin errores  
✅ Permite que otros vean y revisen tu trabajo  
✅ Previene que cambios malos lleguen a producción  
✅ Genera un historial de cambios documentado

---

## 📋 Pasos para Hacer un Pull Request

### **Paso 1: Crea una rama nueva**

En tu terminal local, crea una rama con un nombre descriptivo:

```bash
git checkout -b feature/mi-nueva-funcionalidad
```

**Ejemplos de buenos nombres:**
- `feature/login-form`
- `fix/error-carrito`
- `docs/actualizar-readme`
- `refactor/optimizar-productos`

---

### **Paso 2: Haz tus cambios**

Edita los archivos que necesites:
- Agrega nuevas funciones
- Corrige bugs
- Actualiza documentación
- Mejora el código

---

### **Paso 3: Guarda tus cambios localmente**

```bash
# Mira qué archivos cambiaste
git status

# Agrega todos los cambios
git add .

# O agrega solo archivos específicos
git add archivo1.ts archivo2.ts
```

---

### **Paso 4: Haz un commit con mensaje claro**

```bash
git commit -m "Descripción clara de qué cambió"
```

**Ejemplos de buenos mensajes:**
- `git commit -m "Agregar validación de email en formulario de contacto"`
- `git commit -m "Corregir error de cálculo en carrito"`
- `git commit -m "Mejorar velocidad de carga de imágenes"`

---

### **Paso 5: Sube tu rama a GitHub**

```bash
git push origin feature/mi-nueva-funcionalidad
```

---

### **Paso 6: Crea el Pull Request en GitHub**

1. Ve a **GitHub.com** y entra en tu repositorio
2. GitHub te mostrará un botón que dice **"Compare & pull request"** - haz clic
3. Verifica que:
   - La rama base es `main` (destino)
   - La rama de comparación es tu rama nueva (origen)

---

### **Paso 7: Completa la información del PR**

#### **Título** (obligatorio)
Sé claro y conciso:
- ✅ `Agregar validación de email en formulario`
- ❌ `cambios`

#### **Descripción** (recomendado)
Explica:
- **Qué hiciste:** Cambios que realizaste
- **Por qué:** Razón de los cambios
- **Cómo probarlo:** Pasos para verificar que funciona

**Ejemplo:**
```
## Qué cambió
- Agregué validación de email en el formulario de contacto
- El email ahora se valida antes de enviar

## Por qué
Prevenir que se envíen formularios con emails inválidos

## Cómo probar
1. Ve a la página de contacto
2. Intenta enviar un email inválido (ej: "correo@")
3. Deberías ver un error
```

---

### **Paso 8: Abre el Pull Request**

Haz clic en **"Create pull request"**. ¡Listo!

---

## 🔄 Qué pasa después

1. **Revisión:** El administrador del proyecto revisa tus cambios
2. **Cambios solicitados (opcional):** Si hay cosas que mejorar, lo indicarán
3. **Aprobación:** Si todo está bien, aprueban el PR
4. **Merge:** Tus cambios se integran automáticamente a `main`
5. **Rama eliminada:** Tu rama se elimina (puedes crear otra después)

---

## 💡 Buenas Prácticas

### ✅ Haz PRs pequeños y enfocados
- Cada PR debe hacer **una cosa bien**
- Es más fácil de revisar y menos propenso a errores

### ✅ Actualiza tu rama si hay cambios en main
```bash
git fetch origin
git merge origin/main
```

### ✅ Prueba tu código antes de hacer el PR
- Asegúrate que funciona localmente
- No hagas PR con código roto

### ✅ Escribe descripciones claras
- Otros (y tú futuro) lo van a agradecer

### ✅ Responde a los comentarios de revisión
- Si piden cambios, actualiza tu rama y haz push nuevamente
- El PR se actualizará automáticamente

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo hacer cambios después de abrir el PR?**  
R: Sí, haz cambios en tu rama local, haz commit y push. El PR se actualiza automáticamente.

**P: ¿Qué pasa si hay conflictos?**  
R: Si `main` cambió y hay conflictos, actualiza tu rama:
```bash
git fetch origin
git merge origin/main
# Resuelve los conflictos en los archivos
git add .
git commit -m "Resolver conflictos"
git push origin feature/mi-rama
```

**P: ¿Puedo eliminar mi rama después del merge?**  
R: Sí, GitHub lo pregunta automáticamente. O lo haces manualmente:
```bash
git branch -d feature/mi-rama
```

---

## 📞 Necesitas ayuda?

Si tienes dudas:
1. Revisa esta guía nuevamente
2. Pregunta en el PR
3. Contacta con el administrador del proyecto

¡Gracias por contribuir al proyecto! 🎉
