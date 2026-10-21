import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  useHealthCheck, useListProducts, useGetProduct, useGetStoreSettings, useCreateOrder,
  useGetOrderStatus, useRequestSecondKey, useAdminLogin, useAdminLogout, useGetAdminSession,
  useListOrders, useUpdateProduct, useUpdateStoreSettings, useConfirmOrder, useDeliverSecondKey,
  getListProductsQueryKey, getGetProductQueryKey, getGetStoreSettingsQueryKey,
  getGetAdminSessionQueryKey, getListOrdersQueryKey, getGetOrderStatusQueryKey,
} from '@workspace/api-client-react';
import type { Product, OrderStatus } from '@workspace/api-client-react';
import {
  Route, Switch, Link, useLocation, useRoute, Router as WouterRouter,
} from 'wouter';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, ChevronRight, CircleHelp,
  Clock3, Copy, Gamepad2, Headphones, ImagePlus, KeyRound, LockKeyhole, LogOut,
  PackageCheck, RefreshCw, Search, ShieldCheck, ShoppingBag, Smartphone, Sparkles,
  Ticket, Upload, WalletCards, X,
} from 'lucide-react';

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true }, mutations: { retry: false } },
});
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const productColors = ['#24675f', '#3b4f75', '#b65b42', '#bf7b39', '#706c9c'];
const glyphFor = (p: Product) => p.category.toLowerCase().includes('game') ? 'GG' : p.category.toLowerCase().includes('gift') ? 'GIFT' : p.category.slice(0, 4).toUpperCase();
const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.';

function Header() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setLocation(`/?q=${encodeURIComponent(query)}`);
    window.dispatchEvent(new CustomEvent('store-search', { detail: query }));
  };
  return <>
    <div className="topline"><div className="shell flex h-9 items-center justify-between"><span>Digital goods, delivered with care.</span><span className="hidden sm:inline">UPI payments · Human-verified · India-wide</span></div></div>
    <header className="nav-wrap">
      <div className="shell flex h-[76px] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 no-underline text-inherit" data-testid="link-home">
          <span className="brand-mark">A</span>
          <span><strong className="display block text-[16px] leading-none">Ajay Deals Bazaar</strong><small className="mt-1 block text-[10px] font-semibold uppercase tracking-[.13em] text-[#75817b]">A little more play</small></span>
        </Link>
        <form onSubmit={submitSearch} className="hidden min-w-0 max-w-[460px] flex-1 items-center gap-2 rounded-full border border-[#dfe6df] bg-[#f7faf7] px-4 py-2 md:flex" role="search" data-testid="form-header-search">
          <Search size={17} className="shrink-0 text-[#748078]" />
          <input value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#87918b]" placeholder="Search games and vouchers" aria-label="Search games and vouchers" data-testid="input-header-search" />
          <button type="submit" className="text-xs font-bold text-[#008b43]" data-testid="button-header-search">Search</button>
        </form>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-xs font-semibold text-[#52625c] md:flex"><ShieldCheck size={16} className="text-[#17675b]" /> Manual UPI orders</span>
          <Link href="/admin" className="btn btn-outline !rounded-full !px-4 !py-2.5 text-xs no-underline" data-testid="link-admin"><LockKeyhole size={14} /> Admin</Link>
        </div>
      </div>
    </header>
  </>;
}
function Footer() {
  return <footer className="mt-20 border-t border-[#ded9ce] bg-[#f4f0e6] py-8"><div className="shell flex flex-col justify-between gap-4 text-xs text-[#66716b] sm:flex-row"><span>© Ajay Deals Bazaar · Made for your next good game.</span><span className="flex gap-5"><span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Verified payments</span><span className="flex items-center gap-1.5"><Headphones size={14} /> Helpful human support</span></span></div></footer>;
}
function PageShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  return <><Header /><main className="min-h-[65vh]"><ErrorBoundary resetKey={path}>{children}</ErrorBoundary></main><Footer /></>;
}
function ProductVisual({ product, index = 0, large = false }: { product: Product; index?: number; large?: boolean }) {
  return <div className="product-art" style={{ background: `linear-gradient(145deg, ${productColors[index % productColors.length]}, ${productColors[index % productColors.length]}dd)` }}>
    {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="absolute inset-0 h-full w-full object-cover" /> :
      <><span className="absolute left-5 top-5 rounded-full border border-white/30 px-3 py-1 text-[9px] font-bold uppercase tracking-[.15em] text-white/80">{product.category}</span><span className={`product-glyph ${large ? '!text-6xl' : ''}`}>{glyphFor(product)}</span><Sparkles className="absolute bottom-5 right-5 text-white/55" size={large ? 25 : 18} /></>}
  </div>;
}
function ProductCard({ product, index }: { product: Product; index: number }) {
  const discount = product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  return <article className="panel group flex flex-col overflow-hidden p-2.5 transition hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(39,55,47,.11)]" data-testid={`card-product-${product.id}`}>
    <Link href={`/product/${product.id}`} className="text-inherit no-underline" data-testid={`link-product-${product.id}`}>
      <ProductVisual product={product} index={index} />
      <div className="px-2 pb-2 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2"><span className="truncate text-[10px] font-bold uppercase tracking-[.12em] text-[#77837d]">{product.category}</span>{product.inStock ? <span className="badge badge-green !px-2 !py-1"><span className="h-1.5 w-1.5 rounded-full bg-[#27946b]" /> In stock</span> : <span className="badge badge-red !px-2 !py-1">Out of stock</span>}</div>
        <h3 className="display min-h-[48px] text-[17px] font-semibold leading-snug">{product.title}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1"><strong className="display text-[21px]">{money(product.price)}</strong>{product.originalPrice > product.price&&<del className="text-xs text-[#8b918d]">{money(product.originalPrice)}</del>}{discount>0&&<span className="text-[10px] font-bold text-[#16844b]">{discount}% off</span>}</div>
      </div>
    </Link>
    <Link href={product.inStock?`/checkout/${product.id}`:`/product/${product.id}`} aria-disabled={!product.inStock} className={`btn btn-primary mt-auto w-full !py-2.5 text-xs no-underline ${!product.inStock?'pointer-events-none opacity-50':''}`} data-testid={`button-buy-product-${product.id}`}>Buy now <ArrowRight size={15}/></Link>
  </article>;
}
function Storefront() {
  const { data: products, isLoading, isError, refetch } = useListProducts();
  const { data: health } = useHealthCheck();
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
  useEffect(() => {
    const onSearch = (event: Event) => setSearch((event as CustomEvent<string>).detail ?? '');
    window.addEventListener('store-search', onSearch);
    return () => window.removeEventListener('store-search', onSearch);
  }, []);
  const filtered = useMemo(() => (products ?? []).slice(0, 5).filter(p => `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  return <PageShell><div className="shell pb-8 pt-9">
    <section className="hero min-h-[330px] px-7 py-10 sm:px-12 sm:py-12">
      <div className="hero-copy max-w-[570px]"><span className="section-label flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#e8754e]" /> The good stuff, minus the guesswork</span>
        <h1 className="display mt-5 text-[42px] font-semibold leading-[1.04] tracking-[-.055em] sm:text-[59px]">Play more.<br /><span className="text-[#17675b]">Worry less.</span></h1>
        <p className="mt-4 max-w-[410px] text-sm leading-6 text-[#566660]">Game top-ups and gift codes, carefully handled from payment to delivery. Just pick your next thing.</p>
        <a href="#shop" className="btn btn-primary mt-6 !rounded-full !px-5 !py-3 text-sm no-underline" data-testid="link-shop-now">Find your next unlock <ArrowRight size={16} /></a>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="orbit"><div className="orbit-card"><span className="text-[9px] uppercase tracking-[.2em] text-white/60">good things inside</span><Gamepad2 size={50} /><span className="display text-xl font-semibold">LEVEL<br />UP.</span></div></div></div>
      <div className="absolute bottom-4 right-5 hidden items-center gap-2 text-[10px] font-semibold text-[#597069] sm:flex"><ShieldCheck size={15} /> A real person checks every order</div>
    </section>
    <section className="mt-12" id="shop">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><span className="section-label">Handpicked for you</span><h2 className="display mt-2 text-3xl font-semibold tracking-[-.04em]">The Bazaar shelf</h2><p className="mt-1 text-sm text-[#75817b]">Five useful little upgrades. Nothing you don't need.</p></div>
        <label className="relative block w-full sm:w-[290px]"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#829089]" /><input value={search} onChange={e => setSearch(e.target.value)} className="field !rounded-full !py-3 !pl-10 text-sm" placeholder="Search games or vouchers" aria-label="Search products" data-testid="input-search-products" /></label>
      </div>
      {isLoading ? <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3,4].map(n => <div key={n} className="panel p-3"><div className="skeleton h-[190px]" /><div className="skeleton mt-4 h-5 w-3/4" /><div className="skeleton mt-3 h-4 w-1/2" /></div>)}</div> :
      isError ? <div className="panel mt-7 flex flex-col items-center p-10 text-center" data-testid="state-products-error"><CircleHelp size={28} className="text-[#c46745]" /><h3 className="display mt-3 text-xl font-semibold">The shelf is taking a breather</h3><p className="mt-1 text-sm text-[#75817b]">We couldn't load products right now.</p><button onClick={() => refetch()} className="btn btn-primary mt-4" data-testid="button-retry-products"><RefreshCw size={15} /> Try again</button></div> :
      filtered.length ? <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{filtered.map((p,i) => <ProductCard key={p.id} product={p} index={i} />)}</div> :
      <div className="panel mt-7 p-10 text-center" data-testid="state-products-empty"><Search className="mx-auto text-[#829089]" /><h3 className="display mt-3 text-xl font-semibold">No matches on this shelf</h3><p className="mt-1 text-sm text-[#75817b]">Try a shorter search or a different name.</p></div>}
      {products?.length ? <div className="mt-7 flex items-center justify-center gap-2 text-xs text-[#75817b]" data-testid="text-health-status"><span className={`h-2 w-2 rounded-full ${health?.status === 'ok' ? 'bg-[#3c9c72]' : 'bg-[#e4a34b]'}`} />{health?.status === 'ok' ? 'Store is online and ready' : 'Store status updating'}</div> : null}
    </section>
    <section className="mt-12 grid gap-3 sm:grid-cols-3">
      {[{icon:<WalletCards size={19}/>,title:'Pay your way',body:'Scan a UPI QR or pay to a UPI ID.'},{icon:<BadgeCheck size={19}/>,title:'Checked by a human',body:'We match each payment before sending codes.'},{icon:<PackageCheck size={19}/>,title:'Track it clearly',body:'Your order page stays up to date automatically.'}].map((x,i)=><div key={x.title} className="flex gap-3 rounded-2xl bg-[#f0ece2] p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#17675b]">{x.icon}</span><span><strong className="display text-sm">{x.title}</strong><small className="mt-1 block text-xs leading-5 text-[#75817b]">{x.body}</small></span></div>)}
    </section>
  </div></PageShell>;
}
function ProductPage({ id }: { id: string }) {
  const { data: product, isLoading, isError, refetch } = useGetProduct(id);
  if (isLoading) return <PageShell><div className="shell py-12"><div className="skeleton h-96" /></div></PageShell>;
  if (isError || !product) return <PageShell><div className="shell py-20 text-center"><h2 className="display text-2xl font-semibold">Couldn't find that product</h2><button className="btn btn-primary mt-4" onClick={() => refetch()} data-testid="button-retry-product">Try again</button><Link href="/" className="ml-3 text-sm underline" data-testid="link-back-store">Back to shop</Link></div></PageShell>;
  return <PageShell><div className="shell py-9">
    <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#61716a] no-underline" data-testid="link-back-products"><ArrowLeft size={16}/> Back to the Bazaar</Link>
    <div className="grid gap-8 md:grid-cols-[1.05fr_.95fr]">
      <ProductVisual product={product} large />
      <div className="flex flex-col justify-center py-2"><span className="section-label">{product.category}</span><h1 className="display mt-3 text-4xl font-semibold leading-tight tracking-[-.05em]">{product.title}</h1>
        <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#65716c]" data-testid={`text-product-description-${product.id}`}>{product.description}</p>
        <div className="mt-6 flex items-baseline gap-3"><strong className="display text-3xl">{money(product.price)}</strong><del className="text-[#849089]">{money(product.originalPrice)}</del><span className="badge badge-green">Save {Math.max(0,Math.round((1-product.price/product.originalPrice)*100))}%</span></div>
        <div className="mt-7 flex flex-wrap items-center gap-3">{product.inStock ? <Link href={`/checkout/${product.id}`} className="btn btn-primary !px-6 !py-3 no-underline" data-testid="button-buy-product">Continue to payment <ArrowRight size={17}/></Link> : <button disabled className="btn btn-primary" data-testid="button-product-outofstock">Currently unavailable</button>}<span className="flex items-center gap-2 text-xs text-[#6b7a72]"><ShieldCheck size={16} className="text-[#17675b]"/> Manual payment, verified delivery</span></div>
        <div className="mt-8 grid max-w-lg grid-cols-2 gap-3"><div className="rounded-xl bg-[#f0ece2] p-4"><strong className="display flex items-center gap-2 text-sm"><Ticket size={15} className="text-[#17675b]"/> Digital delivery</strong><p className="mt-2 text-xs leading-5 text-[#6b7a72]">Your code appears on a private order status page.</p></div><div className="rounded-xl bg-[#f0ece2] p-4"><strong className="display flex items-center gap-2 text-sm"><Clock3 size={15} className="text-[#17675b]"/> Human checked</strong><p className="mt-2 text-xs leading-5 text-[#6b7a72]">We verify your UPI payment before fulfillment.</p></div></div>
      </div>
    </div>
  </div></PageShell>;
}
function CheckoutPage({ id }: { id: string }) {
  const { data: product, isLoading: loadingProduct } = useGetProduct(id);
  const { data: settings, isLoading: loadingSettings } = useGetStoreSettings();
  const createOrder = useCreateOrder();
  const [name,setName] = useState(''); const [whatsapp,setWhatsapp] = useState(''); const [utr,setUtr] = useState(''); const [copied,setCopied] = useState(false); const [formError,setFormError] = useState('');
  const [,setLocation] = useLocation();
  const busy = loadingProduct || loadingSettings;
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    if (!product) return;
    if (utr.length !== 12 || !/^\d{12}$/.test(utr)) { setFormError('Please enter the 12-digit UTR from your UPI receipt.'); return; }
    createOrder.mutate({data:{productId:id,name:name.trim(),whatsapp:whatsapp.trim(),utr}}, {onSuccess: order => setLocation(`/status?id=${encodeURIComponent(order.id)}`), onError: e => setFormError(errorMessage(e))});
  };
  if (busy) return <PageShell><div className="shell py-12"><div className="skeleton h-[440px]" /></div></PageShell>;
  if (!product) return <PageShell><div className="shell py-20 text-center"><h2 className="display text-2xl">Product unavailable</h2><Link href="/" className="mt-4 inline-block underline" data-testid="link-checkout-back">Back to shop</Link></div></PageShell>;
  const copyUpi = async () => { if (!settings?.upiId) return; await navigator.clipboard?.writeText(settings.upiId); setCopied(true); window.setTimeout(()=>setCopied(false),1800); };
  return <PageShell><div className="shell max-w-[970px] py-8">
    <Link href={`/product/${product.id}`} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#61716a] no-underline" data-testid="link-checkout-back-product"><ArrowLeft size={16}/> Back to product</Link>
    <div className="mb-6"><span className="section-label">One last step</span><h1 className="display mt-2 text-3xl font-semibold tracking-[-.04em]">Pay securely with UPI</h1><p className="mt-1 text-sm text-[#738078]">We'll check your payment and keep you posted.</p><p className="mt-2 text-sm font-semibold text-[#16844b]" data-testid="text-payment-instructions-hi">QR scan karke pay karein, phir neeche 12-digit UTR number daalein.</p></div>
    <div className="grid gap-5 md:grid-cols-[.85fr_1.15fr]">
      <aside className="space-y-4">
        <div className="panel p-4"><div className="flex gap-4"><div className="w-24 shrink-0"><ProductVisual product={product} /></div><div className="flex flex-col justify-center"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#76827b]">{product.category}</span><h2 className="display mt-1 text-lg font-semibold">{product.title}</h2><strong className="mt-2 text-xl">{money(product.price)}</strong></div></div><div className="mt-4 flex justify-between border-t border-[#ebe6dc] pt-3 text-sm"><span className="text-[#75817b]">Total to pay</span><strong>{money(product.price)}</strong></div></div>
        <div className="panel p-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e8f2ec] text-[#17675b]"><Smartphone size={17}/></span><div><h2 className="display text-base font-semibold">Pay using any UPI app</h2><p className="text-xs text-[#748078]">Scan the QR or use the ID below.</p></div></div>
          <div className="mt-4 flex justify-center rounded-xl bg-[#f6f3ec] p-4">{settings?.qrImageUrl ? <img src={settings.qrImageUrl} alt="UPI payment QR code" className="h-44 w-44 rounded-md object-contain" data-testid="img-payment-qr"/> : <div className="grid h-44 w-44 place-items-center rounded-xl border border-dashed border-[#b9c9bd] bg-white text-center text-xs text-[#75817b]" data-testid="state-qr-unavailable"><div><WalletCards className="mx-auto mb-2 text-[#17675b]"/>QR code not configured<br/>Use the UPI ID instead</div></div>}</div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f5f1e8] px-3.5 py-3"><span><small className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#87918b]">UPI ID</small><strong className="mt-1 block text-sm" data-testid="text-upi-id">{settings?.upiId || 'Not available'}</strong></span><button onClick={copyUpi} disabled={!settings?.upiId} className="btn btn-soft !px-3 !py-2 text-xs" data-testid="button-copy-upi">{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copied':'Copy'}</button></div>
          <p className="mt-3 text-[11px] leading-5 text-[#7a857f]">Please pay exactly <strong>{money(product.price)}</strong>. We never ask for your UPI PIN or OTP.</p>
        </div>
      </aside>
      <form className="panel p-5 sm:p-7" onSubmit={submit} data-testid="form-checkout">
        <div className="mb-5 flex items-center gap-3"><span className="display grid h-8 w-8 place-items-center rounded-full bg-[#17675b] text-sm font-bold text-white">1</span><div><h2 className="display font-semibold">Tell us where to send it</h2><p className="text-xs text-[#75817b]">Order details stay private.</p></div></div>
        <div className="space-y-4"><label className="block text-xs font-bold text-[#46564f]">Your name<input className="field mt-1.5 text-sm" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={100} required placeholder="Name on your order" data-testid="input-buyer-name"/></label>
          <label className="block text-xs font-bold text-[#46564f]">WhatsApp number<input className="field mt-1.5 text-sm" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} minLength={8} maxLength={20} required placeholder="+91 98765 43210" data-testid="input-whatsapp"/></label>
          <div className="rounded-xl bg-[#e8f2ec] p-4"><div className="flex items-center gap-2 text-sm font-bold text-[#17675b]"><CheckCircle2 size={16}/> Payment sent?</div><p className="mt-1 text-xs leading-5 text-[#667970]">Open your UPI app's transaction details and copy the UTR / reference number.</p>
            <label className="mt-3 block text-xs font-bold text-[#46564f]">12-digit UTR number<input className="field mt-1.5 font-mono text-sm tracking-[.15em]" value={utr} onChange={e=>setUtr(e.target.value.replace(/\D/g,'').slice(0,12))} inputMode="numeric" pattern="[0-9]{12}" maxLength={12} required placeholder="0000 0000 0000" data-testid="input-utr"/></label>
            <div className="mt-1 text-right text-[10px] text-[#75817b]" data-testid="text-utr-count">{utr.length}/12 digits</div>
          </div>
        </div>
        {formError&&<div className="mt-4 rounded-lg bg-[#fde9e5] px-3 py-2.5 text-xs text-[#a64136]" role="alert" data-testid="status-checkout-error">{formError}</div>}
        <button type="submit" disabled={createOrder.isPending || !product.inStock} className="btn btn-primary mt-5 w-full !py-3.5" data-testid="button-submit-order">{createOrder.isPending?<><RefreshCw size={16} className="animate-spin"/> Placing your order…</>:<>I've paid — place my order <ArrowRight size={16}/></>}</button>
        <p className="mt-3 text-center text-[10px] leading-5 text-[#859088]">By continuing, you confirm the UTR matches your payment receipt.</p>
      </form>
    </div>
  </div></PageShell>;
}
function StatusPage({ id }: { id: string }) {
  const query = useGetOrderStatus(id, { query:{ refetchInterval: 10000, queryKey:getGetOrderStatusQueryKey(id), retry:false } });
  const requestKey = useRequestSecondKey();
  const [requested,setRequested] = useState(false);
  const [time,setTime] = useState(new Date());
  useEffect(() => { if (query.dataUpdatedAt) setTime(new Date(query.dataUpdatedAt)); }, [query.dataUpdatedAt]);
  const qc = useQueryClient();
  const order = query.data;
  const askSecond = () => requestKey.mutate({id}, {onSuccess: async()=>{setRequested(true);await qc.invalidateQueries({queryKey:getGetOrderStatusQueryKey(id)});}, onError:()=>setRequested(false)});
  if (query.isLoading) return <PageShell><div className="shell max-w-[720px] py-12"><div className="skeleton h-[450px]"/></div></PageShell>;
  if (query.isError || !order) return <PageShell><div className="shell max-w-[680px] py-20 text-center"><div className="panel p-10"><CircleHelp className="mx-auto text-[#ca7154]" size={32}/><h1 className="display mt-4 text-2xl font-semibold">We can't find that order</h1><p className="mt-2 text-sm text-[#748078]">Check the link in your browser or return to the Bazaar.</p><Link href="/" className="btn btn-primary mt-5 no-underline" data-testid="link-status-home">Back to shop</Link></div></div></PageShell>;
  const confirmed=order.status==='confirmed';
  const refresh=async()=>{await query.refetch();setTime(new Date());};
  return <PageShell><div className="shell max-w-[790px] py-9">
    <div className="mb-5 flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#61716a] no-underline" data-testid="link-status-home"><ArrowLeft size={16}/> Bazaar home</Link><button onClick={refresh} className="btn btn-outline !px-3 !py-2 text-xs" data-testid="button-refresh-status"><RefreshCw size={14} className={query.isFetching?'animate-spin':''}/> Refresh status</button></div>
    <div className={`overflow-hidden rounded-[24px] p-6 sm:p-9 ${confirmed?'bg-[#deeee3]':'bg-[#fff0d5]'}`}>
      <span className={`badge ${confirmed?'badge-green':'badge-amber'}`} data-testid="status-order"><span className={`h-2 w-2 rounded-full ${confirmed?'bg-[#308a65]':'bg-[#c99032]'}`}/>{confirmed?'Payment confirmed':'Payment under review'}</span>
      <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><h1 className="display text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{confirmed?'Your order is ready.':'We’re checking your payment.'}</h1><p className="mt-2 max-w-lg text-sm leading-6 text-[#64736b]">{confirmed?'Your digital delivery is below. Keep this page handy.':'A real person is matching your UTR with the payment. This page checks for updates every 12 seconds.'}</p></div><div className="grid h-[70px] w-[70px] place-items-center rounded-2xl bg-white/70 text-[#17675b]">{confirmed?<PackageCheck size={34}/>:<Clock3 size={32}/>}</div></div>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-black/10 pt-4 text-xs text-[#596a62]"><span>Order <strong className="font-mono" data-testid="text-order-id">{order.id}</strong></span><span>Placed {new Date(order.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</span><span className="flex items-center gap-1"><RefreshCw size={12}/> Updated {time.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span></div>
    </div>
    <div className="panel mt-5 p-5"><div className="flex items-center gap-4"><img src={order.productImageUrl || ''} alt="" className="h-[62px] w-[68px] rounded-xl bg-[#e7eee6] object-cover" data-testid="img-order-product"/><div className="min-w-0 flex-1"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#77837d]">Your order</span><h2 className="display mt-1 truncate text-lg font-semibold" data-testid="text-order-product">{order.productTitle}</h2></div><strong className="display text-xl">{money(order.amount)}</strong></div></div>
    {confirmed&&<div className="mt-5 space-y-3">{order.firstKey&&<KeyCard title="Your first key" value={order.firstKey} testId="text-first-key"/>}
      {order.secondKey&&<KeyCard title="Your second key" value={order.secondKey} testId="text-second-key"/>}
      {!order.secondKey&&<div className="panel flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><h3 className="display font-semibold">Need a second key?</h3><p className="mt-1 text-xs text-[#748078]">{order.secondKeyRequested?'Your request is in. We’ll add it here when ready.':'Request the second digital key for this order.'}</p></div><button disabled={order.secondKeyRequested||requested||requestKey.isPending} onClick={askSecond} className="btn btn-soft shrink-0" data-testid="button-request-second-key">{requestKey.isPending?<RefreshCw size={15} className="animate-spin"/>:<KeyRound size={15}/>} {order.secondKeyRequested||requested?'Request sent':'Request second key'}</button></div>}</div>}
    <div className="mt-5 rounded-2xl bg-[#f1ede3] p-5"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#17675b]"/><strong className="display text-sm">What happens next</strong></div><div className="mt-4 grid gap-4 sm:grid-cols-3">{[{n:'01',t:'Payment',d:'We verify your 12-digit UTR.'},{n:'02',t:'Confirmation',d:'Your order status changes here.'},{n:'03',t:'Delivery',d:'Your key appears on this page.'}].map((s,i)=><div key={s.n} className="flex gap-3"><span className={`display text-xs font-bold ${confirmed||i===0?'text-[#17675b]':'text-[#a0a8a2]'}`}>{s.n}</span><span><strong className="block text-xs">{s.t}</strong><small className="mt-1 block text-[11px] leading-4 text-[#75817b]">{s.d}</small></span></div>)}</div></div>
  </div></PageShell>;
}
function KeyCard({title,value,testId}:{title:string;value:string;testId:string}) {
  const [copied,setCopied]=useState(false);
  const copy=async()=>{await navigator.clipboard?.writeText(value);setCopied(true);window.setTimeout(()=>setCopied(false),1800);};
  return <div className="rounded-2xl border border-[#b8d4c1] bg-[#eaf4ed] p-5"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold text-[#17675b]"><CheckCircle2 size={17}/>{title}</span><button onClick={copy} className="btn btn-soft !px-3 !py-2 text-xs" data-testid={`button-copy-${testId}`}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copied':'Copy key'}</button></div><div className="mt-3 break-all rounded-xl border border-[#c7ddcd] bg-white px-4 py-3 font-mono text-sm tracking-wide" data-testid={testId}>{value}</div></div>;
}
function AdminLogin() {
  const login=useAdminLogin({request:{credentials:'same-origin'}}); const qc=useQueryClient();
  const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [err,setErr]=useState('');
  const submit=(e:React.FormEvent)=>{e.preventDefault();setErr('');login.mutate({data:{username,password}},{onSuccess:async()=>{await qc.invalidateQueries({queryKey:getGetAdminSessionQueryKey()});},onError:e=>setErr(errorMessage(e))});};
  return <div className="mx-auto max-w-[450px] px-4 py-12 sm:py-20"><div className="panel p-7 sm:p-9">
    <div className="brand-mark !h-12 !w-12 !rounded-2xl"><LockKeyhole size={20}/></div><span className="section-label mt-6 block">Bazaar operations</span><h1 className="display mt-2 text-3xl font-semibold tracking-[-.04em]">Admin sign in</h1><p className="mt-2 text-sm leading-6 text-[#748078]">Manage your product shelf, payment details and customer orders.</p>
    <form onSubmit={submit} className="mt-7 space-y-4" data-testid="form-admin-login"><label className="block text-xs font-bold">Username<input className="field mt-1.5 text-sm" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required data-testid="input-admin-username"/></label><label className="block text-xs font-bold">Password<input className="field mt-1.5 text-sm" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required data-testid="input-admin-password"/></label>
      {err&&<div className="rounded-lg bg-[#fde9e5] p-3 text-xs text-[#a64136]" role="alert" data-testid="status-login-error">{err}</div>}
      <button disabled={login.isPending} className="btn btn-primary w-full" data-testid="button-admin-login">{login.isPending?<RefreshCw className="animate-spin" size={16}/>:<LockKeyhole size={16}/>} {login.isPending?'Signing in…':'Sign in securely'}</button>
    </form><p className="mt-5 flex items-center gap-2 text-[11px] text-[#7a857f]"><ShieldCheck size={14}/> Session protected with a secure cookie.</p>
  </div></div>;
}
function ImageField({label,onChange,testId}:{label:string;onChange:(v:string)=>void;testId:string}) {
  const [filename,setFilename]=useState('');
  return <label className="block cursor-pointer text-xs font-bold">{label}<span className="mt-1.5 flex items-center gap-2 rounded-xl border border-dashed border-[#bcc9c0] bg-[#f7f5ee] px-3 py-3 text-xs text-[#61716a]"><Upload size={15}/>{filename||'Choose an image file'}<input type="file" accept="image/*" className="sr-only" data-testid={testId} onChange={e=>{const f=e.target.files?.[0];if(!f)return;setFilename(f.name);const r=new FileReader();r.onload=()=>onChange(String(r.result));r.readAsDataURL(f);}}/></span></label>;
}
function AdminPanel() {
  const qc=useQueryClient();
  const session=useGetAdminSession({query:{retry:false,refetchOnWindowFocus:true,queryKey:getGetAdminSessionQueryKey()},request:{credentials:'same-origin'}});
  const productsQuery=useListProducts({query:{enabled:!!session.data?.authenticated,queryKey:getListProductsQueryKey()}});
  const settingsQuery=useGetStoreSettings({query:{enabled:!!session.data?.authenticated,queryKey:getGetStoreSettingsQueryKey()}});
  const ordersQuery=useListOrders({query:{enabled:!!session.data?.authenticated,refetchInterval:15000,queryKey:getListOrdersQueryKey()},request:{credentials:'same-origin'}});
  const logout=useAdminLogout({request:{credentials:'same-origin'}});
  const [tab,setTab]=useState<'orders'|'products'|'settings'>('orders');
  const [editId,setEditId]=useState('');
  const [form,setForm]=useState({title:'',description:'',price:'',originalPrice:'',category:'',inStock:true,imageData:''});
  const [upiId,setUpiId]=useState(''); const [qrImageData,setQrImageData]=useState(''); const [notice,setNotice]=useState('');
  const authenticated=!!session.data?.authenticated;
  const updateProduct=useUpdateProduct({request:{credentials:'same-origin'}}); const updateSettings=useUpdateStoreSettings({request:{credentials:'same-origin'}}); const confirm=useConfirmOrder({request:{credentials:'same-origin'}}); const deliver=useDeliverSecondKey({request:{credentials:'same-origin'}});
  const setProductForm=(p:Product)=>{setEditId(p.id);setForm({title:p.title,description:p.description,price:String(p.price),originalPrice:String(p.originalPrice),category:p.category,inStock:p.inStock,imageData:''});setNotice('');};
  const saveProduct=(e:React.FormEvent)=>{e.preventDefault();if(!editId)return;updateProduct.mutate({id:editId,data:{...form,price:Number(form.price),originalPrice:Number(form.originalPrice),imageData:form.imageData||''}},{onSuccess:async()=>{setNotice('Product saved.');await qc.invalidateQueries({queryKey:getListProductsQueryKey()});await qc.invalidateQueries({queryKey:getGetProductQueryKey(editId)});},onError:e=>setNotice(errorMessage(e))});};
  const saveSettings=(e:React.FormEvent)=>{e.preventDefault();updateSettings.mutate({data:{upiId, ...(qrImageData?{qrImageData}:{})}},{onSuccess:async()=>{setNotice('Payment settings saved.');await qc.invalidateQueries({queryKey:getGetStoreSettingsQueryKey()});},onError:e=>setNotice(errorMessage(e))});};
  useEffect(()=>{if(settingsQuery.data)setUpiId(settingsQuery.data.upiId);},[settingsQuery.data?.upiId]);
  if(session.isLoading)return <div className="shell py-12"><div className="skeleton mx-auto h-[380px] max-w-[450px]"/></div>;
  if(!authenticated)return <AdminLogin/>;
  const allOrders=ordersQuery.data??[];
  const secondKeyAlerts=allOrders.filter(order=>order.secondKeyRequested&&!order.secondKey);
  return <div className="shell py-8">
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="section-label">Back office</span><h1 className="display mt-2 text-3xl font-semibold tracking-[-.04em]">Good morning, Ajay.</h1><p className="mt-1 text-sm text-[#75817b]">A clear view of the Bazaar, all in one place.</p></div><button className="btn btn-outline self-start !px-3 !py-2 text-xs sm:self-auto" onClick={()=>logout.mutate(undefined,{onSuccess:()=>qc.invalidateQueries({queryKey:getGetAdminSessionQueryKey()})})} disabled={logout.isPending} data-testid="button-admin-logout"><LogOut size={14}/> Sign out</button></div>
    {notice&&<div className="mb-4 rounded-xl bg-[#e8f2ec] px-4 py-3 text-sm text-[#17675b]" role="status" data-testid="status-admin-notice">{notice}<button className="float-right" onClick={()=>setNotice('')} aria-label="Dismiss notice"><X size={15}/></button></div>}
    <div className="mb-5 flex gap-2 overflow-x-auto border-b border-[#ded9ce]">{[{id:'orders',name:'Orders',icon:<PackageCheck size={15}/>},{id:'products',name:'Products',icon:<ShoppingBag size={15}/>},{id:'settings',name:'Payment settings',icon:<WalletCards size={15}/>}].map(t=><button key={t.id} onClick={()=>setTab(t.id as typeof tab)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${tab===t.id?'border-[#17675b] text-[#17675b]':'border-transparent text-[#77837d]'}`} data-testid={`button-admin-tab-${t.id}`}>{t.icon}{t.name}{t.id==='orders'&&<span className="rounded-full bg-[#eee9df] px-2 py-0.5 text-[10px]">{allOrders.filter(o=>o.status==='pending').length}</span>}</button>)}</div>
    {tab==='orders'&&<section>
      {secondKeyAlerts.length>0&&<div className="mb-4 flex items-center gap-3 rounded-xl border border-[#f1d28b] bg-[#fff6df] px-4 py-3 text-sm font-semibold text-[#76561a]" role="alert" data-testid="alert-second-key-request"><KeyRound size={17}/>{secondKeyAlerts.length===1?'A customer needs their second key':`${secondKeyAlerts.length} customers need their second key`}<span className="ml-auto text-xs font-medium">Open the matching order below</span></div>}
      {ordersQuery.isLoading?<div className="space-y-3">{[1,2,3].map(i=><div className="skeleton h-28" key={i}/>)}</div>:
      ordersQuery.isError?<div className="panel p-8 text-center" data-testid="state-admin-orders-error"><p className="text-sm">Orders couldn't load.</p><button onClick={()=>ordersQuery.refetch()} className="btn btn-primary mt-3" data-testid="button-retry-orders"><RefreshCw size={14}/> Retry</button></div>:
      allOrders.length===0?<div className="panel flex flex-col items-center p-12 text-center" data-testid="state-admin-orders-empty"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f2ec] text-[#17675b]"><PackageCheck/></span><h2 className="display mt-4 text-xl font-semibold">No orders just yet</h2><p className="mt-1 text-sm text-[#75817b]">New customer orders will appear here.</p></div>:
      <div className="space-y-3">{allOrders.map(o=><AdminOrder key={o.id} order={o} onConfirm={(key)=>confirm.mutate({id:o.id,data:{key}},{onSuccess:async()=>{setNotice('Order confirmed and key delivered.');await qc.invalidateQueries({queryKey:getListOrdersQueryKey()});await qc.invalidateQueries({queryKey:getGetOrderStatusQueryKey(o.id)});},onError:e=>setNotice(errorMessage(e))})} onSecond={(key)=>deliver.mutate({id:o.id,data:{key}},{onSuccess:async()=>{setNotice('Second key delivered.');await qc.invalidateQueries({queryKey:getListOrdersQueryKey()});await qc.invalidateQueries({queryKey:getGetOrderStatusQueryKey(o.id)});},onError:e=>setNotice(errorMessage(e))})} confirming={confirm.isPending} delivering={deliver.isPending}/>)}</div>}
      <div className="mt-4 text-right text-[11px] text-[#829089]" data-testid="text-admin-polling">Order list refreshes every 15 seconds</div>
    </section>}
    {tab==='products'&&<section className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
      <div className="panel p-5"><div className="flex items-center justify-between"><div><h2 className="display text-lg font-semibold">Your shelf</h2><p className="mt-1 text-xs text-[#75817b]">Exactly five storefront products.</p></div><span className="badge badge-green">{(productsQuery.data??[]).slice(0,5).length} products</span></div>
        {productsQuery.isLoading?<div className="mt-4 space-y-2">{[1,2,3].map(n=><div className="skeleton h-16" key={n}/>)}</div>:productsQuery.isError?<button onClick={()=>productsQuery.refetch()} className="btn btn-outline mt-4" data-testid="button-retry-admin-products">Retry loading</button>:<div className="mt-4 space-y-2">{(productsQuery.data??[]).slice(0,5).map(p=><button key={p.id} onClick={()=>setProductForm(p)} className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left ${editId===p.id?'border-[#17675b] bg-[#edf5ef]':'border-[#eee9df] bg-white'}`} data-testid={`button-edit-product-${p.id}`}><ProductVisual product={p} index={(productsQuery.data??[]).indexOf(p)}/><span className="min-w-0 flex-1"><strong className="display block truncate text-sm">{p.title}</strong><small className="mt-1 block text-xs text-[#75817b]">{money(p.price)} · {p.inStock?'In stock':'Unavailable'}</small></span><ChevronRight size={16} className="text-[#86938c]"/></button>)}</div>}
      </div>
      <div className="panel p-5 sm:p-6"><h2 className="display text-lg font-semibold">{editId?'Edit product':'Choose a product'}</h2><p className="mt-1 text-xs text-[#75817b]">Update how this item appears in your storefront.</p>
        {editId?<form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={saveProduct} data-testid="form-product-edit">
          <label className="text-xs font-bold">Title<input className="field mt-1.5 text-sm" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required data-testid="input-product-title"/></label>
          <label className="text-xs font-bold">Category<input className="field mt-1.5 text-sm" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required data-testid="input-product-category"/></label>
          <label className="text-xs font-bold">Price (₹)<input className="field mt-1.5 text-sm" type="number" min="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required data-testid="input-product-price"/></label>
          <label className="text-xs font-bold">Original price (₹)<input className="field mt-1.5 text-sm" type="number" min="1" value={form.originalPrice} onChange={e=>setForm({...form,originalPrice:e.target.value})} required data-testid="input-product-original-price"/></label>
          <label className="text-xs font-bold sm:col-span-2">Description<textarea className="field mt-1.5 min-h-24 resize-y text-sm" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required data-testid="input-product-description"/></label>
          <div className="sm:col-span-2"><ImageField label="Product artwork (optional)" testId="input-product-image" onChange={v=>setForm({...form,imageData:v})}/></div>
          <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.inStock} onChange={e=>setForm({...form,inStock:e.target.checked})} className="h-4 w-4 accent-[#17675b]" data-testid="input-product-stock"/> Available for purchase</label>
          <div className="flex gap-2 sm:col-span-2"><button disabled={updateProduct.isPending} className="btn btn-primary" data-testid="button-save-product">{updateProduct.isPending?'Saving…':'Save product'}</button><button type="button" className="btn btn-outline" onClick={()=>setEditId('')} data-testid="button-cancel-product-edit">Cancel</button></div>
        </form>:<div className="mt-8 rounded-xl border border-dashed border-[#ccd3ca] p-8 text-center"><ImagePlus size={24} className="mx-auto text-[#7d8a82]"/><p className="mt-3 text-sm font-semibold">Pick an item from your shelf</p><p className="mt-1 text-xs text-[#75817b]">Its details will open here for editing.</p></div>}
      </div>
    </section>}
    {tab==='settings'&&<div className="grid gap-5 md:grid-cols-[1fr_.8fr]">
      <form className="panel p-6" onSubmit={saveSettings} data-testid="form-payment-settings"><span className="section-label">UPI details</span><h2 className="display mt-2 text-xl font-semibold">Where customers pay</h2><p className="mt-1 text-xs leading-5 text-[#75817b]">Keep these details current. They appear during checkout.</p>
        {settingsQuery.isLoading?<div className="skeleton mt-5 h-24"/>:settingsQuery.isError?<button type="button" onClick={()=>settingsQuery.refetch()} className="btn btn-outline mt-4" data-testid="button-retry-settings">Retry loading settings</button>:<>
          <label className="mt-5 block text-xs font-bold">UPI ID<input className="field mt-1.5 text-sm" value={upiId||settingsQuery.data?.upiId||''} onChange={e=>setUpiId(e.target.value)} placeholder="name@bank" required data-testid="input-settings-upi"/></label>
          <div className="mt-4"><ImageField label="Replace QR code image (optional)" testId="input-settings-qr" onChange={setQrImageData}/></div>
          {settingsQuery.data?.qrImageUrl&&!qrImageData&&<div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f5f2eb] p-3"><img src={settingsQuery.data.qrImageUrl} alt="Current UPI QR code" className="h-16 w-16 rounded-lg bg-white object-contain" data-testid="img-admin-current-qr"/><span className="text-xs text-[#66736c]">Current QR is active</span></div>}
          {qrImageData&&<div className="mt-3 text-xs font-semibold text-[#17675b]">New QR image selected</div>}
          <button disabled={updateSettings.isPending} className="btn btn-primary mt-5" data-testid="button-save-settings">{updateSettings.isPending?'Saving…':'Save payment details'} <ArrowRight size={15}/></button>
        </>}
      </form>
      <div className="rounded-[20px] bg-[#deeee3] p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#17675b]"><ShieldCheck size={20}/></span><h3 className="display mt-4 text-xl font-semibold">A little payment reassurance</h3><p className="mt-2 text-sm leading-6 text-[#62756b]">Customers see your QR code, UPI ID and the exact amount before checkout. They submit a UTR so you can match the transfer before confirming.</p><div className="mt-5 border-t border-[#bfd8c7] pt-4 text-xs leading-5 text-[#62756b]">Never request a customer’s UPI PIN, OTP or banking password.</div></div>
    </div>}
  </div>;
}
function AdminOrder({order,onConfirm,onSecond,confirming,delivering}:{order:OrderStatus;onConfirm:(key:string)=>void;onSecond:(key:string)=>void;confirming:boolean;delivering:boolean}) {
  const [key,setKey]=useState(''); const [second,setSecond]=useState('');
  return <article className="panel p-4 sm:p-5" data-testid={`card-admin-order-${order.id}`}>
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><img src={order.productImageUrl||''} alt="" className="h-14 w-16 rounded-xl bg-[#e8f0e9] object-cover" data-testid={`img-admin-order-${order.id}`}/><div className="min-w-0"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#78847d]">{order.id}</span><h3 className="display truncate text-base font-semibold">{order.productTitle}</h3><small className="text-xs text-[#75817b]">{new Date(order.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</small></div></div><span className={`badge ${order.status==='confirmed'?'badge-green':'badge-amber'}`} data-testid={`status-admin-order-${order.id}`}>{order.status==='confirmed'?'Confirmed':'Pending review'}</span></div>
    <div className="mt-4 grid gap-3 rounded-xl bg-[#f5f2eb] p-3 text-xs sm:grid-cols-4"><div><small className="text-[#87918b]">Buyer</small><strong className="mt-1 block" data-testid={`text-order-name-${order.id}`}>{order.name}</strong></div><div><small className="text-[#87918b]">WhatsApp</small><strong className="mt-1 block">{order.whatsapp}</strong></div><div><small className="text-[#87918b]">Amount</small><strong className="mt-1 block">{money(order.amount)}</strong></div><div><small className="text-[#87918b]">UTR</small><strong className="mt-1 block font-mono tracking-wider" data-testid={`text-order-utr-${order.id}`}>{order.utr}</strong></div></div>
    {order.status==='pending'?<form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={e=>{e.preventDefault();if(key.trim())onConfirm(key.trim());}}><input className="field min-w-0 flex-1 font-mono text-sm" value={key} onChange={e=>setKey(e.target.value)} placeholder="Enter first digital key" required maxLength={500} data-testid={`input-first-key-${order.id}`}/><button disabled={confirming} className="btn btn-primary shrink-0" data-testid={`button-confirm-order-${order.id}`}>{confirming?<RefreshCw size={14} className="animate-spin"/>:<CheckCircle2 size={15}/>} Confirm & deliver</button></form>:
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"><span className="inline-flex items-center gap-2 text-xs font-semibold text-[#17675b]"><CheckCircle2 size={15}/> First key delivered</span>{order.secondKey?<span className="text-xs text-[#66736c]">Second key delivered</span>:order.secondKeyRequested?<form className="flex min-w-0 flex-1 gap-2" onSubmit={e=>{e.preventDefault();if(second.trim())onSecond(second.trim());}}><input className="field min-w-0 font-mono text-sm" value={second} onChange={e=>setSecond(e.target.value)} placeholder="Second key requested" required maxLength={500} data-testid={`input-second-key-${order.id}`}/><button disabled={delivering} className="btn btn-soft shrink-0" data-testid={`button-deliver-second-key-${order.id}`}>{delivering?'Sending…':'Send key'}</button></form>:<span className="text-xs text-[#89938d]">No second key requested</span>}</div>}
  </article>;
}
function NotFound() { return <PageShell><div className="shell py-24 text-center"><span className="section-label">404 · Wrong aisle</span><h1 className="display mt-3 text-4xl font-semibold">This page isn't on our shelf.</h1><Link href="/" className="btn btn-primary mt-6 no-underline" data-testid="link-notfound-home">Take me home <ArrowRight size={16}/></Link></div></PageShell>; }
function RouteViews() {
  const [productMatch,productParams]=useRoute('/product/:id');
  const [checkoutMatch,checkoutParams]=useRoute('/checkout/:id');
  const [statusMatch,statusParams]=useRoute('/status/:id');
  const [statusQueryMatch]=useRoute('/status');
  const statusQueryId=new URLSearchParams(window.location.search).get('id');
  return <Switch>
    <Route path="/"><Storefront/></Route>
    <Route path="/product/:id">{productMatch&&productParams?.id?<ProductPage id={productParams.id}/>:<NotFound/>}</Route>
    <Route path="/checkout/:id">{checkoutMatch&&checkoutParams?.id?<CheckoutPage id={checkoutParams.id}/>:<NotFound/>}</Route>
    <Route path="/status/:id">{statusMatch&&statusParams?.id?<StatusPage id={statusParams.id}/>:<NotFound/>}</Route>
    <Route path="/status">{statusQueryMatch&&statusQueryId?<StatusPage id={statusQueryId}/>:<NotFound/>}</Route>
    <Route path="/admin"><PageShell><AdminPanel/></PageShell></Route>
    <Route component={NotFound}/>
  </Switch>;
}
function App() {
  return <QueryClientProvider client={client}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><RouteViews/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}
export default App;
