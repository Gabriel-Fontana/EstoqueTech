"use client"
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

// CONFIGURAÇÃO DO BANCO DE DADOS (Lê as chaves da Vercel)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EstoqueTechMaster() {
  const [view, setView] = useState('login') 
  const [aba, setAba] = useState('dashboard')
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  
  const [auth, setAuth] = useState({ email: '', senha: '', chave: '', confirma: '' })
  const [listaLotes, setListaLotes] = useState<any[]>([])
  const [historicoConsumo, setHistoricoConsumo] = useState<any[]>([])
  const [editando, setEditando] = useState<any>(null)
  const [consumindo, setConsumindo] = useState<any>(null)
  const [formEntrada, setFormEntrada] = useState({ codigo: '', nome: '', qtd: 0, lote: '', validade: '', tipo: 'MP' })

  // Carregamento de dados do Supabase
  const carregarDados = useCallback(async () => {
    const { data: lotes } = await supabase.from('lotes').select('*').order('created_at', { ascending: false })
    const { data: consumos } = await supabase.from('consumo').select('*, lotes(*)').order('data_consumo', { ascending: false })
    if (lotes) setListaLotes(lotes)
    if (consumos) setHistoricoConsumo(consumos)
  }, [])

  useEffect(() => { if (view === 'sistema') carregarDados() }, [view, carregarDados])

  // --- ACESSO E SEGURANÇA ---
  async function handleLogin() {
    const { data } = await supabase.from('usuarios').select('*').eq('email', auth.email).eq('senha', auth.senha).single()
    if (data) setView('sistema') 
    else alert("Credenciais incorretas")
  }

  async function handleRegistro() {
    if (auth.senha !== auth.confirma) return alert("Senhas não conferem")
    const { error } = await supabase.from('usuarios').insert([{ email: auth.email, senha: auth.senha, palavra_chave: auth.chave }])
    if (!error) { alert("Conta criada!"); setView('login'); }
    else alert("Erro ao registrar")
  }

  async function handleRecuperar() {
    const { data } = await supabase.from('usuarios').select('*').eq('email', auth.email).eq('palavra_chave', auth.chave).single()
    if (data) {
      await supabase.from('usuarios').update({ senha: auth.senha }).eq('email', auth.email)
      alert("Senha redefinida!"); setView('login')
    } else alert("Dados de recuperação inválidos")
  }

  // --- OPERAÇÕES ---
  async function registrarEntrada() {
    const unidade = formEntrada.tipo === 'MP' ? 'kg' : 'un'
    await supabase.from('lotes').insert([{
      codigo_item: formEntrada.codigo, descricao: formEntrada.nome.toUpperCase(),
      quantidade_inicial: formEntrada.qtd, quantidade_atual: formEntrada.qtd,
      numero_lote: formEntrada.lote.toUpperCase(), data_validade: formEntrada.validade || null,
      tipo: formEntrada.tipo, unidade
    }]);
    setAba('dashboard'); carregarDados();
  }

  async function registrarConsumo(lote: any, qtd: number) {
    if (!qtd || qtd <= 0) return alert("Insira quantidade válida")
    const novaQtd = lote.quantidade_atual - qtd
    await supabase.from('consumo').insert([{ lote_id: lote.id, quantidade_consumida: qtd }])
    await supabase.from('lotes').update({ quantidade_atual: novaQtd }).eq('id', lote.id)
    setConsumindo(null); carregarDados();
  }

  const ranking = useMemo(() => {
    const agrupado = historicoConsumo
      .filter(c => filtroTipo === 'TODOS' || c.lotes?.tipo === filtroTipo)
      .reduce((acc: any, curr: any) => {
        const nome = curr.lotes?.descricao || "Outros";
        acc[nome] = (acc[nome] || 0) + Number(curr.quantidade_consumida);
        return acc;
      }, {});
    return Object.entries(agrupado).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).slice(0, 5);
  }, [historicoConsumo, filtroTipo]);

  if (view !== 'sistema') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-slate-900 font-sans">
        <h1 className="text-4xl md:text-6xl font-black italic mb-10 tracking-tighter">Estoque<span className="text-green-600">Tech</span></h1>
        <div className="bg-slate-50 p-8 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-100">
          <h2 className="text-[10px] font-black uppercase text-slate-400 mb-6 text-center tracking-widest">{view.toUpperCase()}</h2>
          <div className="space-y-4">
            <input placeholder="E-mail" onChange={e => setAuth({...auth, email: e.target.value})} className="w-full bg-white p-4 rounded-2xl border outline-none font-bold text-black" />
            <input type="password" placeholder={view === 'recuperar' ? "Nova Senha" : "Senha"} onChange={e => setAuth({...auth, senha: e.target.value})} className="w-full bg-white p-4 rounded-2xl border outline-none font-bold text-black" />
            {(view === 'registro' || view === 'recuperar') && (
              <><input type={view === 'registro' ? "password" : "text"} placeholder={view === 'registro' ? "Confirmar" : "Palavra-Chave"} onChange={e => view === 'registro' ? setAuth({...auth, confirma: e.target.value}) : setAuth({...auth, chave: e.target.value})} className="w-full bg-white p-4 rounded-2xl border outline-none font-bold text-black" />
              {view === 'registro' && <input placeholder="Criar Palavra-Chave" onChange={e => setAuth({...auth, chave: e.target.value})} className="w-full bg-green-50 p-4 rounded-2xl border border-green-200 outline-none font-bold text-black" />}</>
            )}
            <button onClick={view === 'login' ? handleLogin : view === 'registro' ? handleRegistro : handleRecuperar} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-sm">Confirmar</button>
            <button onClick={() => setView(view === 'login' ? 'registro' : 'login')} className="w-full text-[9px] font-black text-slate-400 uppercase text-center mt-2">{view === 'login' ? 'Criar Conta' : 'Voltar'}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      <header className="bg-white border-b p-4 md:p-6 flex flex-col md:flex-row justify-between items-center sticky top-0 z-50 gap-4 shadow-sm">
        <h1 className="text-xl md:text-2xl font-black italic text-slate-900">Estoque<span className="text-green-600">Tech</span></h1>
        <nav className="flex gap-4 md:gap-8 overflow-x-auto w-full md:w-auto px-2 no-scrollbar">
          {['dashboard', 'entrada', 'consumo', 'validade'].map(t => (
            <button key={t} onClick={() => setAba(t)} className={`text-xs md:text-base font-bold uppercase whitespace-nowrap ${aba === t ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-500'}`}>{t}</button>
          ))}
        </nav>
        <button onClick={() => setView('login')} className="hidden md:block text-xs font-black text-red-500 bg-red-50 px-4 py-2 rounded-xl">Sair</button>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 w-full flex-grow">
        <div className="flex bg-white p-1 rounded-2xl shadow-md border w-full md:w-fit mx-auto gap-1">
          {['TODOS', 'MP', 'PA'].map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} className={`flex-1 md:px-10 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase ${filtroTipo === t ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>{t}</button>
          ))}
        </div>

        {aba === 'dashboard' && (
          <section className="bg-white rounded-[1.5rem] border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                  <tr><th className="p-4">Status</th><th>Item</th><th>Lote</th><th>Saldo</th><th className="text-right px-6">Gestão</th></tr>
                </thead>
                <tbody className="divide-y text-slate-900 font-medium text-sm">
                  {listaLotes.filter(l => filtroTipo === 'TODOS' || l.tipo === filtroTipo).map(l => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-4">{l.quantidade_atual > 500 ? "🟢" : l.quantidade_atual <= 0 ? "🟡" : "🔴"}</td>
                      <td className="font-bold uppercase">{l.descricao}</td>
                      <td className="text-[10px] text-slate-400">{l.numero_lote}</td>
                      <td className="font-black text-lg">{l.quantidade_atual} <small className="opacity-30">{l.unidade}</small></td>
                      <td className="text-right px-4 space-x-1">
                        <button onClick={() => setConsumindo(l)} className="bg-red-50 text-red-600 px-2 py-1 rounded text-[9px] font-black uppercase">Baixar</button>
                        <button onClick={() => setEditando(l)} className="bg-slate-50 text-slate-400 px-2 py-1 rounded text-[9px] font-black uppercase">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        
        {/* Outras abas simplificadas para o build não falhar */}
        {aba === 'entrada' && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border shadow-xl">
             <input placeholder="Item" onChange={e => setFormEntrada({...formEntrada, nome: e.target.value})} className="w-full border-b p-4 font-bold outline-none mb-4" />
             <input type="number" placeholder="Quantidade" onChange={e => setFormEntrada({...formEntrada, qtd: Number(e.target.value)})} className="w-full border-b p-4 font-bold outline-none mb-4" />
             <button onClick={registrarEntrada} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black">Lançar</button>
          </div>
        )}
      </main>
    </div>
  )
}