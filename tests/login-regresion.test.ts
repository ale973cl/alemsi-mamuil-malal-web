import test from 'node:test';
import assert from 'node:assert/strict';
import { esRolInterno, hashPasswordHistorico, normalizarSesion, usuarioActivo } from '../lib/auth/core.ts';
import { HOME_BY_ROLE } from '../lib/reglas/permisos.ts';
test('SHA-256 histórico no cambia',()=>{assert.equal(hashPasswordHistorico('password'),'5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8');});
test('login acepta únicamente activos y roles internos',()=>{assert.equal(usuarioActivo(1),true);assert.equal(usuarioActivo(0),false);assert.equal(esRolInterno('Finanzas'),true);assert.equal(esRolInterno('Comensal'),false);});
test('cada rol interno tiene redirección canónica',()=>{for(const rol of ['AdminTotal','AdminCasino','Finanzas','Cocina','Coordinacion','Gerencia','Bodega','Operaciones'] as const)assert.match(HOME_BY_ROLE[rol],/^\//);});
test('sesión normaliza payload canónico y legado conservando debe cambiar password',()=>{assert.deepEqual(normalizarSesion({username:'fin',role:'Finanzas',name:'Finanzas',mustChangePassword:true}),{username:'fin',rol:'Finanzas',nombre:'Finanzas',correo:undefined,debeCambiarPassword:true});assert.equal(normalizarSesion({username:'x',rol:'Desconocido'}),null);});
