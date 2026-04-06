from typing import Callable, Dict, List, Any

class EventBus:
    def __init__(self):
        # Mapeia nome do evento para lista de funções callback
        self._listeners: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, listener: Callable):
        if event_type not in self._listeners:
            self._listeners[event_type] = []
        self._listeners[event_type].append(listener)

    def publish(self, event_type: str, payload: Any = None):
        if event_type in self._listeners:
            for listener in self._listeners[event_type]:
                try:
                    listener(payload)
                except Exception as e:
                    # Logamos mas não paramos o pipeline se um ouvinte falhar
                    import logging
                    logging.error(f"Erro ao disparar listener para {event_type}: {e}")

# Instância Singleton
event_bus = EventBus()
