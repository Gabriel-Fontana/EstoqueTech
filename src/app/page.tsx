"use client"
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

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

  // Carregamento de dados assertivo
  const carregarDados = useCallback(async () => {
    const { data: lotes } = await supabase.from('lotes').select('*').order('created_at', { ascending: false })
    const { data: consumos } = await supabase.from('consumo').select('*, lotes(*)').order('data_consumo', { ascending: false })
    if (lotes) setListaLotes(lotes)
    if (consumos) setHistoricoConsumo(consumos)
  }, [])

  useEffect(() => { if (view === 'sistema') carregarDados() }, [view, carregarDados])

  // --- ACESSO E SEGURANÇA ---
  async function handleLogin() {
    const { data, error } = await supabase.from('usuarios').select('*').eq('email', auth.email).eq('senha', auth.senha).single()
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

  // --- OPERAÇÕES E EDIÇÃO ---
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
    return Object.entries(agrupado).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
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
            {view === 'login' && <button onClick={() => setView('recuperar')} className="w-full text-[9px] font-black text-slate-300 uppercase text-center">Esqueci a Senha</button>}
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
          <>
            <section className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px] md:min-w-full">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                    <tr><th className="p-4 md:p-6">Status</th><th>Item / Código</th><th>Lote</th><th>Saldo</th><th className="text-right px-6 md:px-12">Gestão</th></tr>
                  </thead>
                  <tbody className="divide-y text-slate-900 font-medium">
                    {listaLotes.filter(l => filtroTipo === 'TODOS' || l.tipo === filtroTipo).map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 text-xs md:text-sm">
                        <td className="p-4 md:p-6">{l.quantidade_atual > 500 ? "🟢" : l.quantidade_atual <= 0 ? "🟡" : "🔴"}</td>
                        <td><p className="font-bold uppercase leading-tight">{l.descricao}</p><p className="text-[9px] text-slate-400 uppercase font-mono">{l.codigo_item}</p></td>
                        <td className="text-[10px] text-slate-400">{l.numero_lote}</td>
                        <td className="font-black text-lg md:text-2xl tracking-tighter italic">{l.quantidade_atual} <small className="text-[10px] opacity-30">{l.unidade}</small></td>
                        <td className="text-right px-4 md:px-8 space-x-1">
                           <button onClick={() => setConsumindo(l)} className="bg-red-50 text-red-600 px-2 py-1 rounded-[8px] text-[9px] font-black uppercase">Baixar</button>
                           <button onClick={() => setEditando(l)} className="bg-slate-50 text-slate-400 px-2 py-1 rounded-[8px] text-[9px] font-black uppercase">Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <section className="bg-white p-6 md:p-12 rounded-[1.5rem] md:rounded-[3rem] border shadow-sm overflow-hidden">
                <h2 className="text-xs md:text-xl font-black mb-8 md:mb-12 uppercase italic text-center">Nível de Inventário</h2>
                <div className="flex h-[250px] md:h-[300px] w-full border-b relative">
                  <div className="flex flex-col justify-between text-[8px] md:text-[9px] font-black text-slate-300 pr-2 md:pr-4 border-r pb-2">
                    {[10000, 5000, 1000, 500, 0].map(v => <span key={v}>{v}</span>)}
                  </div>
                  <div className="flex-1 flex items-end justify-around px-2 md:px-8 gap-2 md:gap-4">
                    {listaLotes.filter(l => filtroTipo === 'TODOS' || l.tipo === filtroTipo).slice(0, 5).map((l, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div className="absolute -top-10 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all font-bold whitespace-nowrap z-20 shadow-xl border border-slate-700">Entrada: {l.quantidade_inicial} | Atual: {l.quantidade_atual}</div>
                        <div className="flex items-end gap-1 w-full h-[250px]">
                           <div className="bg-blue-100 w-1/2 rounded-t-lg h-full relative overflow-hidden"><div className="bg-blue-400 w-full absolute bottom-0" style={{height: `${Math.min((l.quantidade_inicial / 10000) * 100, 100)}%`}}></div></div>
                           <div className="bg-green-100 w-1/2 rounded-t-lg h-full relative overflow-hidden"><div className="bg-green-500 w-full absolute bottom-0 shadow-lg" style={{height: `${Math.min((l.quantidade_atual / 10000) * 100, 100)}%`}}></div></div>
                        </div>
                        <span className="text-[7px] md:text-[8px] font-black uppercase text-center mt-2 leading-tight truncate w-full">{l.descricao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="bg-slate-900 p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] text-white">
                 <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-6 md:mb-8 text-green-500 text-center italic underline">Ranking de Utilização Mensal</h3>
                 <div className="space-y-4">
                    {ranking.map(([nome, qtd]: any, idx) => (
                      <div key={idx} className="flex justify-between border-b border-white/10 pb-2 text-xs md:text-sm font-bold uppercase">
                        <span>{idx + 1}. {nome}</span>
                        <span className="text-green-400">{qtd.toLocaleString()} <small className="text-[8px]">MOV</small></span>
                      </div>
                    ))}
                 </div>
              </section>
            </div>
          </>
        )}

        {/* MODAL DE EDIÇÃO ASSERTIVO */}
        {editando && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-black">
            <div className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-black mb-6 uppercase italic text-slate-900 border-l-4 border-green-500 pl-4">Editar Matéria Prima</h3>
              <div className="space-y-4">
                <div><label className="text-[9px] font-black text-slate-400 uppercase">Nome</label>
                <input value={editando.descricao} onChange={e => setEditando({...editando, descricao: e.target.value.toUpperCase()})} className="w-full border-b p-2 font-bold text-black text-sm outline-none" /></div>
                <div><label className="text-[9px] font-black text-slate-400 uppercase">Quantidade</label>
                <input type="number" value={editando.quantidade_atual} onChange={e => setEditando({...editando, quantidade_atual: Number(e.target.value)})} className="w-full border-b p-2 font-bold text-black text-sm outline-none" /></div>
                <div><label className="text-[9px] font-black text-slate-400 uppercase">Lote</label>
                <input value={editando.numero_lote} onChange={e => setEditando({...editando, numero_lote: e.target.value.toUpperCase()})} className="w-full border-b p-2 font-bold text-black text-sm outline-none" /></div>
                <div><label className="text-[9px] font-black text-slate-400 uppercase">Validade</label>
                <input type="date" value={editando.data_validade || ''} onChange={e => setEditando({...editando, data_validade: e.target.value})} className="w-full border-b p-2 font-bold text-black text-sm outline-none" /></div>
                <div className="flex gap-3 pt-4">
                  <button onClick={async () => { await supabase.from('lotes').update(editando).eq('id', editando.id); setEditando(null); carregarDados(); }} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Salvar</button>
                  <button onClick={async () => { if(confirm("Excluir item?")) { await supabase.from('lotes').delete().eq('id', editando.id); setEditando(null); carregarDados(); } }} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Excluir</button>
                </div>
                <button onClick={() => setEditando(null)} className="w-full text-[9px] font-black text-slate-400 uppercase mt-2">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {consumindo && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-black">
             <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm shadow-2xl">
                <h3 className="text-sm font-black uppercase italic mb-6">Registrar Baixa: {consumindo.descricao}</h3>
                <input type="number" id="baixa-qty" className="w-full border-b p-4 font-black text-3xl text-center outline-none mb-6" placeholder="0" />
                <div className="flex gap-2">
                   <button onClick={() => registrarConsumo(consumindo, Number((document.getElementById('baixa-qty') as HTMLInputElement).value))} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-xs">Confirmar</button>
                   <button onClick={() => setConsumindo(null)} className="px-6 border py-4 rounded-xl font-black uppercase text-xs">Sair</button>
                </div>
             </div>
          </div>
        )}

        {aba === 'entrada' && (
          <div className="w-full max-w-xl mx-auto bg-white p-6 md:p-12 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl border animate-in slide-in-from-bottom-4">
            <h2 className="text-xl md:text-2xl font-black text-green-600 mb-8 uppercase text-center border-b pb-4 italic">Entrada de Material</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                 <button onClick={() => setFormEntrada({...formEntrada, tipo: 'MP'})} className={`flex-1 py-3 md:py-4 rounded-xl font-black border-2 transition-all ${formEntrada.tipo === 'MP' ? 'border-green-500 bg-green-50' : 'text-slate-400 border-slate-100'}`}>MP (kg)</button>
                 <button onClick={() => setFormEntrada({...formEntrada, tipo: 'PA'})} className={`flex-1 py-3 md:py-4 rounded-xl font-black border-2 transition-all ${formEntrada.tipo === 'PA' ? 'border-blue-500 bg-blue-50' : 'text-slate-400 border-slate-100'}`}>PA (un)</button>
              </div>
              <input placeholder="Cód Item" onChange={e => setFormEntrada({...formEntrada, codigo: e.target.value})} className="w-full border-b p-3 font-bold bg-slate-50/50 rounded-lg outline-none text-black" />
              <input placeholder="Descrição" onChange={e => setFormEntrada({...formEntrada, nome: e.target.value})} className="w-full border-b p-3 font-bold bg-slate-50/50 rounded-lg outline-none text-black" />
              <input type="number" placeholder="Quantidade" onChange={e => setFormEntrada({...formEntrada, qtd: Number(e.target.value)})} className="w-full border-b p-3 font-bold bg-slate-50/50 rounded-lg outline-none text-black" />
              <input placeholder="Lote" onChange={e => setFormEntrada({...formEntrada, lote: e.target.value})} className="w-full border-b p-3 font-bold bg-slate-50/50 rounded-lg outline-none text-black" />
              <div className="pt-2"><label className="text-[9px] font-black text-slate-300 uppercase ml-1">Validade</label>
              <input type="date" onChange={e => setFormEntrada({...formEntrada, validade: e.target.value})} className="w-full border-b p-3 outline-none text-slate-900 bg-slate-50/50 rounded-lg font-bold" /></div>
              <button onClick={registrarEntrada} className="w-full bg-slate-900 text-white py-5 md:py-6 rounded-2xl font-black uppercase text-sm md:text-lg shadow-xl hover:bg-green-600 transition-all">Lançar Registro</button>
            </div>
          </div>
        )}

        {aba === 'consumo' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {listaLotes.filter(l => filtroTipo === 'TODOS' || l.tipo === filtroTipo).filter(l => l.quantidade_atual > 0).map(l => (
                <div key={l.id} className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border shadow-sm group hover:border-red-400 transition-all">
                   <h3 className="font-black text-sm md:text-lg uppercase mb-4 text-black border-l-4 border-red-500 pl-4 leading-tight">{l.descricao}</h3>
                   <div className="flex gap-2">
                      <input type="number" id={`direct-${l.id}`} placeholder="0" className="w-full bg-slate-50 border p-3 rounded-xl font-bold text-black text-sm outline-none" />
                      <button onClick={() => registrarConsumo(l, Number((document.getElementById(`direct-${l.id}`) as HTMLInputElement).value))} className="bg-red-500 text-white px-5 rounded-xl font-black text-[10px] uppercase">Baixar</button>
                   </div>
                   <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase italic">Saldo: {l.quantidade_atual} {l.unidade} | Lote: {l.numero_lote}</p>
                </div>
              ))}
           </div>
        )}

        {aba === 'validade' && (
          <section className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border shadow-sm overflow-hidden animate-in fade-in">
             <div className="p-4 md:p-8 bg-slate-900 text-white italic"><h2 className="text-sm md:text-xl font-black uppercase tracking-tighter border-l-4 border-red-600 pl-4">Monitor de Validade</h2></div>
             <div className="overflow-x-auto">
               <table className="w-full text-left min-w-[500px] md:min-w-full">
                  <thead className="bg-slate-50 text-[9px] md:text-[10px] font-black text-slate-400 uppercase border-b">
                    <tr><th className="p-4 md:p-8">Material</th><th>Lote</th><th>Vencimento</th><th>Status</th><th className="text-center">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y text-black font-bold uppercase text-[10px] md:text-xs">
                    {listaLotes.filter(l => l.data_validade).map(l => {
                      const diff = Math.ceil((new Date(l.data_validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="p-4 md:p-8">{l.descricao}</td>
                          <td className="text-slate-400">{l.numero_lote}</td>
                          <td>{new Date(l.data_validade).toLocaleDateString('pt-BR')}</td>
                          <td className="p-4"><span className={`px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black ${diff < 15 ? 'bg-red-500 text-white animate-pulse' : 'bg-green-100 text-green-700'}`}>{diff} DIAS</span></td>
                          <td className="text-center"><button onClick={async () => { if(confirm("Excluir?")) { await supabase.from('lotes').delete().eq('id', l.id); carregarDados(); } }} className="text-red-400 text-base">🗑️</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
               </table>
             </div>
          </section>
        )}
      </main>

      <footer className="w-full py-10 md:py-16 flex flex-col items-center justify-center border-t bg-white mt-auto px-4 text-center">
        <p className="text-xs md:text-base font-light tracking-[0.1em] md:tracking-[0.2em] text-slate-400 font-sans">
          EstoqueTech <span className="mx-2 md:mx-4 font-black text-slate-200">|</span> Todos os direitos reservados por Gabriel Fontana
        </p>
      </footer>
    </div>
  )
}