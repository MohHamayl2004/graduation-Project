import { useId } from 'react';

export default function IntroFallback() {
  const id = useId().replaceAll(':', '');
  return (
    <div className="intro-fallback" aria-hidden="true">
      <div className="intro-halo" />
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}Facade`} x2="0" y2="1"><stop stopColor="#e5f0ed"/><stop offset="1" stopColor="#638e96"/></linearGradient>
          <linearGradient id={`${id}Glass`} x2="1" y2="1"><stop stopColor="#71afb9"/><stop offset=".55" stopColor="#1e5369"/></linearGradient>
          <linearGradient id={`${id}Path`} x2="0" y2="1"><stop stopColor="#709897"/><stop offset="1" stopColor="#091b30"/></linearGradient>
        </defs>
        <path d="M0 675L720 490 1440 675V900H0Z" fill="#142e3c"/>
        <path d="M610 610H830L1140 900H300Z" fill={`url(#${id}Path)`}/>
        <path d="M230 350L720 260 1210 350V660H230Z" fill={`url(#${id}Facade)`}/>
        <path d="M250 374L700 296V631L250 650Z M740 296L1190 374V650L740 631Z" fill={`url(#${id}Glass)`}/>
        {[340,450,560,870,980,1090].map(x => <path key={x} d={`M${x} 350V645`} stroke="#b4d5d0" strokeWidth="8"/>)}
        <path d="M246 476H1194M246 555H1194" stroke="#bed8d3" strokeWidth="9"/>
        <path d="M595 423H845V664H595Z" fill="#112c40" stroke="#8cbbb8" strokeWidth="9"/>
        <path d="M623 454H817V656H623Z" fill="#92c9c3" opacity=".35"/>
        <path d="M720 454V656" stroke="#d9eece" strokeWidth="4"/>
        <path d="M560 420H880L850 389H590Z" fill="#d4e7db"/>
        {[160,1280].map(x => <g key={x}><path d={`M${x} 680V529`} stroke="#596f62" strokeWidth="13"/><ellipse cx={x} cy="530" rx="64" ry="83" fill="#317872"/><ellipse cx={x-15} cy="504" rx="40" ry="54" fill="#479287"/></g>)}
        {[0,1,2,3].map(i => <path key={i} d={`M${580-i*55} ${704+i*49}H${860+i*55}`} stroke="#b4d6cb" strokeOpacity=".25" strokeWidth="2"/>)}
      </svg>
    </div>
  );
}
