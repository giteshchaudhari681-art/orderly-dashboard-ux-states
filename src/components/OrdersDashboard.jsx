import { useEffect, useMemo, useState } from 'react'
import { fetchOrders } from '../mockApi'

const STATUS_STYLES = {
  Delivered: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', dot: '#10b981' },
  Shipped: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', dot: '#3b82f6' },
  Processing: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b' },
  Pending: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', dot: '#8b5cf6' },
  Cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', dot: '#ef4444' },
}

const TABLE_HEADERS = ['Order ID', 'Customer Name', 'Order Date', 'Total Amount', 'Status', 'Priority Flag']
const STATUS_OPTIONS = ['All statuses', 'Delivered', 'Shipped', 'Processing', 'Pending', 'Cancelled']

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

function getPriority(order) {
  if (order.status === 'Cancelled') {
    return { label: 'Blocked', tone: 'critical' }
  }

  if (order.status === 'Pending' || order.status === 'Processing' || order.amount >= 15000 || order.items > 1) {
    return { label: 'High', tone: 'high' }
  }

  if (order.status === 'Shipped' || order.amount >= 7000) {
    return { label: 'Medium', tone: 'medium' }
  }

  return { label: 'Low', tone: 'low' }
}

function getPriorityStyles(tone) {
  switch (tone) {
    case 'critical':
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)' }
    case 'high':
      return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' }
    case 'medium':
      return { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' }
    default:
      return { color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' }
  }
}

function getErrorCopy(message) {
  const normalized = message.toLowerCase()

  if (normalized.includes('503') || normalized.includes('temporarily unavailable')) {
    return {
      title: 'Order service is temporarily unavailable',
      description: 'The dashboard reached the API, but the order service is down for maintenance or overloaded.',
      action: 'Retry in a moment',
    }
  }

  if (normalized.includes('timeout')) {
    return {
      title: 'The order request timed out',
      description: 'Large order volumes or a slow connection prevented the dashboard from loading before the request expired.',
      action: 'Try the request again',
    }
  }

  if (normalized.includes('network') || normalized.includes('failed to fetch')) {
    return {
      title: 'Orderly could not reach the orders API',
      description: 'Check your network connection or VPN, then retry the request.',
      action: 'Retry after reconnecting',
    }
  }

  if (normalized.includes('401') || normalized.includes('403')) {
    return {
      title: 'You no longer have access to these orders',
      description: 'Your session or permissions may have changed. Refresh after signing in again.',
      action: 'Retry after re-authenticating',
    }
  }

  return {
    title: 'The orders request could not be completed',
    description: 'Orderly received an unexpected response. Retry now or refresh the page if the issue continues.',
    action: 'Retry request',
  }
}

function getStatusBreakdown(orders) {
  return Object.keys(STATUS_STYLES)
    .map((status) => ({ status, count: orders.filter((order) => order.status === status).length }))
    .filter((entry) => entry.count > 0)
}

function getSummaryMetrics(orders) {
  return {
    totalOrders: orders.length,
    totalValue: orders.reduce((sum, order) => sum + order.amount, 0),
    statusBreakdown: getStatusBreakdown(orders),
  }
}

function SectionCard({ children, style }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function MetricCard({ label, value, caption, icon, accent }) {
  return (
    <SectionCard style={{ padding: '24px 24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: accent, fontFamily: 'var(--mono)', marginBottom: 8 }}>{value}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{caption}</div>
    </SectionCard>
  )
}

function SkeletonBlock({ width = '100%', height = 14, radius = 8 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 20%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 80%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
      }}
    />
  )
}

function SummarySection({ orders, loading, filterLabel }) {
  const metrics = getSummaryMetrics(orders)

  return (
    <div style={{ display: 'grid', gap: 18, marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard
          label="Total Orders"
          value={loading ? <SkeletonBlock width={92} height={30} radius={10} /> : metrics.totalOrders}
          caption={filterLabel}
          icon="📦"
          accent="var(--accent)"
        />
        <MetricCard
          label="Total Value"
          value={loading ? <SkeletonBlock width={132} height={30} radius={10} /> : formatCurrency(metrics.totalValue)}
          caption="Combined order value for the current view."
          icon="💰"
          accent="var(--green)"
        />
        <MetricCard
          label="Status Breakdown"
          value={loading ? <SkeletonBlock width={120} height={30} radius={10} /> : metrics.statusBreakdown.length}
          caption="Distinct statuses currently represented."
          icon="📊"
          accent="var(--blue)"
        />
      </div>

      <SectionCard style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Status breakdown</span>
          {loading ? (
            <>
              <SkeletonBlock width={94} />
              <SkeletonBlock width={86} />
              <SkeletonBlock width={102} />
            </>
          ) : metrics.statusBreakdown.length > 0 ? (
            metrics.statusBreakdown.map(({ status, count }) => {
              const tone = STATUS_STYLES[status]
              return (
                <span
                  key={status}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 999,
                    background: tone.bg,
                    color: tone.color,
                    border: `1px solid ${tone.dot}33`,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone.dot }} />
                  {status}: {count}
                </span>
              )
            })
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No statuses to summarize yet.</span>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

function FiltersBar({ search, status, onSearchChange, onStatusChange, onClear }) {
  return (
    <SectionCard style={{ padding: '18px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ display: 'grid', gap: 8, flex: '1 1 260px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Search orders
          </span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by order ID or customer name"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 8, minWidth: 220 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Status
          </span>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              outline: 'none',
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={onClear}
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontWeight: 600,
          }}
        >
          Clear filters
        </button>
      </div>
    </SectionCard>
  )
}

function OrdersTable({ title, subtitle, children }) {
  return (
    <SectionCard style={{ overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{subtitle}</p>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {TABLE_HEADERS.map((header) => (
                <th
                  key={header}
                  style={{
                    textAlign: 'left',
                    padding: '12px 20px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </SectionCard>
  )
}

function OrdersLoadingState() {
  return (
    <OrdersTable
      title="Orders are loading"
      subtitle="Preparing the latest fulfillment view for operations, warehouse, and support teams."
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {[96, 146, 120, 100, 100, 86].map((width, cellIndex) => (
            <td key={cellIndex} style={{ padding: '18px 20px' }}>
              <SkeletonBlock width={width} />
            </td>
          ))}
        </tr>
      ))}
    </OrdersTable>
  )
}

function OrderRow({ order }) {
  const statusTone = STATUS_STYLES[order.status] || STATUS_STYLES.Pending
  const priority = getPriority(order)
  const priorityStyle = getPriorityStyles(priority.tone)

  return (
    <tr
      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.18s ease' }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'rgba(255,255,255,0.02)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent'
      }}
    >
      <td style={{ padding: '16px 20px', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{order.id}</td>
      <td style={{ padding: '16px 20px', color: 'var(--text-primary)', fontWeight: 600 }}>{order.customer}</td>
      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(order.date)}</td>
      <td style={{ padding: '16px 20px', color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'var(--mono)' }}>{formatCurrency(order.amount)}</td>
      <td style={{ padding: '16px 20px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: statusTone.bg,
            color: statusTone.color,
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusTone.dot }} />
          {order.status}
        </span>
      </td>
      <td style={{ padding: '16px 20px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 999,
            background: priorityStyle.bg,
            color: priorityStyle.color,
            border: `1px solid ${priorityStyle.border}`,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: priorityStyle.color }} />
          {priority.label}
        </span>
      </td>
    </tr>
  )
}

function OrdersSuccessState({ orders }) {
  return (
    <OrdersTable
      title="Recent orders"
      subtitle="A scannable view of the orders currently visible in the dashboard."
    >
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </OrdersTable>
  )
}

function OrdersEmptyState({ variant, onResetFilters, onRefresh }) {
  const copy = variant === 'filtered'
    ? {
        icon: '🔎',
        title: 'No orders match the active filter',
        description: 'Try a different search term or clear the status filter to bring matching orders back into view.',
        ctaLabel: 'Clear filters',
        onClick: onResetFilters,
      }
    : {
        icon: '📭',
        title: 'No orders have landed yet',
        description: 'Orderly is connected, but there are currently no orders to process. Refresh later or create the first order from your upstream workflow.',
        ctaLabel: 'Refresh dashboard',
        onClick: onRefresh,
      }

  return (
    <OrdersTable title="No orders to display" subtitle="The dashboard is working, but there is nothing actionable in the current view.">
      <tr>
        <td colSpan={6} style={{ padding: '54px 24px' }}>
          <div style={{ display: 'grid', placeItems: 'center', textAlign: 'center', gap: 14 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 24,
                background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(59,130,246,0.16))',
                display: 'grid',
                placeItems: 'center',
                fontSize: 34,
              }}
            >
              {copy.icon}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{copy.title}</div>
            <div style={{ maxWidth: 520, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{copy.description}</div>
            <button
              onClick={copy.onClick}
              style={{
                marginTop: 6,
                padding: '12px 18px',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(245,158,11,0.4)',
                background: 'var(--accent-dim)',
                color: 'var(--text-primary)',
                fontWeight: 700,
              }}
            >
              {copy.ctaLabel}
            </button>
          </div>
        </td>
      </tr>
    </OrdersTable>
  )
}

function OrdersErrorState({ message, onRetry }) {
  const copy = getErrorCopy(message)

  return (
    <OrdersTable
      title="Orders could not be loaded"
      subtitle="The dashboard has a specific failure reason and keeps the next recovery step visible."
    >
      <tr>
        <td colSpan={6} style={{ padding: '46px 24px' }}>
          <div
            style={{
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'linear-gradient(180deg, rgba(239,68,68,0.14), rgba(239,68,68,0.05))',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              display: 'grid',
              gap: 14,
              justifyItems: 'start',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#fca5a5', fontWeight: 700 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <span>{copy.title}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{copy.description}</div>
            <div
              style={{
                width: '100%',
                borderRadius: 'var(--radius)',
                background: 'rgba(11,15,25,0.32)',
                border: '1px solid rgba(239,68,68,0.18)',
                padding: '12px 14px',
                color: '#fecaca',
                fontFamily: 'var(--mono)',
                fontSize: 13,
              }}
            >
              API response: {message}
            </div>
            <button
              onClick={onRetry}
              style={{
                padding: '12px 18px',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(239,68,68,0.35)',
                background: 'rgba(239,68,68,0.12)',
                color: 'var(--text-primary)',
                fontWeight: 700,
              }}
            >
              ↻ {copy.action}
            </button>
          </div>
        </td>
      </tr>
    </OrdersTable>
  )
}

export default function OrdersDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All statuses')

  const loadOrders = () => {
    setLoading(true)
    setError(null)

    fetchOrders()
      .then((data) => {
        setOrders(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        search.trim() === '' ||
        `${order.id} ${order.customer}`.toLowerCase().includes(search.trim().toLowerCase())

      const matchesStatus = status === 'All statuses' || order.status === status

      return matchesSearch && matchesStatus
    })
  }, [orders, search, status])

  const hasActiveFilters = search.trim() !== '' || status !== 'All statuses'
  const visibleOrders = hasActiveFilters ? filteredOrders : orders
  const filterLabel = loading
    ? 'Loading the current order portfolio.'
    : hasActiveFilters
      ? `${visibleOrders.length} matching ${visibleOrders.length === 1 ? 'order' : 'orders'} for the active filters.`
      : 'All fetched orders currently visible to the team.'

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 56px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 30, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(59,130,246,0.9))',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 16px 32px rgba(15, 23, 42, 0.28)',
                fontSize: 20,
              }}
            >
              📦
            </div>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>Orders Dashboard</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Track demand, spot exceptions, and keep fulfillment moving throughout the day.</p>
            </div>
          </div>
        </div>

        <button
          onClick={loadOrders}
          style={{
            padding: '12px 18px',
            background: 'var(--accent)',
            color: '#111827',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: 14,
            fontWeight: 800,
            boxShadow: '0 10px 24px rgba(245,158,11,0.24)',
          }}
        >
          ↻ Refresh orders
        </button>
      </div>

      <div style={{ animation: 'fadeUp 0.2s ease' }}>
        <SummarySection orders={visibleOrders} loading={loading} filterLabel={filterLabel} />

        {!loading && !error && orders.length > 0 && (
          <FiltersBar
            search={search}
            status={status}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onClear={() => {
              setSearch('')
              setStatus('All statuses')
            }}
          />
        )}

        {loading ? (
          <OrdersLoadingState />
        ) : error ? (
          <OrdersErrorState message={error} onRetry={loadOrders} />
        ) : orders.length === 0 ? (
          <OrdersEmptyState variant="all" onRefresh={loadOrders} onResetFilters={() => {}} />
        ) : filteredOrders.length === 0 ? (
          <OrdersEmptyState
            variant="filtered"
            onRefresh={loadOrders}
            onResetFilters={() => {
              setSearch('')
              setStatus('All statuses')
            }}
          />
        ) : (
          <OrdersSuccessState orders={filteredOrders} />
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
