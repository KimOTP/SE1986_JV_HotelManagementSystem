import { useCallback, useEffect, useRef, useState } from 'react';
import { roomsApi } from '../api/roomsApi';
export function useRoomsData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestSeq = useRef(0);
  const reload = useCallback(async () => {
    const requestId = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const value = await roomsApi.getMap();
      if (requestId === requestSeq.current) setData(value);
    } catch (e) {
      if (requestId === requestSeq.current)
        setError(e?.response?.data?.message || e.message || 'Không thể tải dữ liệu.');
    } finally {
      if (requestId === requestSeq.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const requestId = ++requestSeq.current;
    (async () => {
      setLoading(true);
      try {
        const v = await roomsApi.getMap();
        if (requestId === requestSeq.current) setData(v);
      } catch (e) {
        if (requestId === requestSeq.current) setError(e?.response?.data?.message || e.message);
      } finally {
        if (requestId === requestSeq.current) setLoading(false);
      }
    })();
    return () => {
      requestSeq.current += 1;
    };
  }, []);
  return { data, loading, error, reload };
}
