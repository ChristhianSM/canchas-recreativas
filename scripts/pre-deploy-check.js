#!/usr/bin/env node

/**
 * Script de verificación pre-deploy
 * Verifica que todo esté listo para producción
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando proyecto para deploy...\n');

const checks = [];

// 1. Verificar que existe package.json
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  checks.push({
    name: 'package.json existe',
    status: true,
    details: `Nombre: ${pkg.name}, Versión: ${pkg.version}`
  });
  
  // Verificar scripts necesarios
  if (pkg.scripts && pkg.scripts.build) {
    checks.push({
      name: 'Script de build configurado',
      status: true,
      details: pkg.scripts.build
    });
  } else {
    checks.push({
      name: 'Script de build configurado',
      status: false,
      details: 'Falta script "build" en package.json'
    });
  }
} else {
  checks.push({
    name: 'package.json existe',
    status: false,
    details: 'Archivo package.json no encontrado'
  });
}

// 2. Verificar Next.js config
if (fs.existsSync('next.config.js') || fs.existsSync('next.config.mjs')) {
  checks.push({
    name: 'Configuración de Next.js',
    status: true,
    details: 'next.config.js encontrado'
  });
} else {
  checks.push({
    name: 'Configuración de Next.js',
    status: true,
    details: 'Usando configuración por defecto'
  });
}

// 3. Verificar .env.example
if (fs.existsSync('.env.example')) {
  checks.push({
    name: 'Archivo .env.example',
    status: true,
    details: 'Plantilla de variables de entorno disponible'
  });
} else {
  checks.push({
    name: 'Archivo .env.example',
    status: false,
    details: 'Recomendado para documentar variables de entorno'
  });
}

// 4. Verificar .gitignore
if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const hasEnv = gitignore.includes('.env.local') || gitignore.includes('.env');
  checks.push({
    name: 'Archivos .env ignorados en Git',
    status: hasEnv,
    details: hasEnv ? 'Variables de entorno protegidas' : 'Agregar .env.local a .gitignore'
  });
} else {
  checks.push({
    name: '.gitignore existe',
    status: false,
    details: 'Archivo .gitignore no encontrado'
  });
}

// 5. Verificar estructura de carpetas
const requiredDirs = ['app', 'lib', 'components'];
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    checks.push({
      name: `Carpeta ${dir}`,
      status: true,
      details: 'Estructura correcta'
    });
  } else {
    checks.push({
      name: `Carpeta ${dir}`,
      status: false,
      details: `Carpeta ${dir} no encontrada`
    });
  }
});

// 6. Verificar archivos críticos
const criticalFiles = [
  'app/layout.tsx',
  'app/page.tsx',
  'lib/supabase.ts',
  'lib/types.ts'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    checks.push({
      name: `Archivo ${file}`,
      status: true,
      details: 'Archivo crítico presente'
    });
  } else {
    checks.push({
      name: `Archivo ${file}`,
      status: false,
      details: `Archivo crítico faltante: ${file}`
    });
  }
});

// 7. Verificar vercel.json
if (fs.existsSync('vercel.json')) {
  checks.push({
    name: 'Configuración de Vercel',
    status: true,
    details: 'vercel.json configurado'
  });
} else {
  checks.push({
    name: 'Configuración de Vercel',
    status: false,
    details: 'vercel.json recomendado para configuración avanzada'
  });
}

// Mostrar resultados
console.log('📋 Resultados de la verificación:\n');

let allPassed = true;
checks.forEach((check, index) => {
  const icon = check.status ? '✅' : '❌';
  const status = check.status ? 'PASS' : 'FAIL';
  
  console.log(`${icon} ${check.name}: ${status}`);
  if (check.details) {
    console.log(`   ${check.details}`);
  }
  console.log('');
  
  if (!check.status) allPassed = false;
});

// Resumen final
console.log('=' .repeat(50));
if (allPassed) {
  console.log('🎉 ¡Proyecto listo para deploy!');
  console.log('');
  console.log('Próximos pasos:');
  console.log('1. Sube tu código a GitHub');
  console.log('2. Conecta tu repo con Vercel');
  console.log('3. Configura las variables de entorno');
  console.log('4. ¡Deploy!');
} else {
  console.log('⚠️  Hay algunos problemas que deberías revisar antes del deploy.');
  console.log('Los elementos marcados con ❌ son recomendaciones para mejorar el deploy.');
}

console.log('');
console.log('📖 Lee DEPLOY_INSTRUCTIONS.md para instrucciones detalladas.');