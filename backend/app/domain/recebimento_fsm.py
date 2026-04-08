from transitions import Machine

class RecebimentoFSM(object):
    estados = [
        'IMPORTADO',            
        'PENDENTE',
        'BLOQUEADO',            
        'AGUARDANDO_LIBERACAO', 
        'AGUARDANDO_CONFERENCIA',
        'EM_CONFERENCIA',       
        'REJEITADO',
        'CONCLUIDO'             
    ]

    def __init__(self, recebimento_model):
        self.model = recebimento_model
        
        estado_inicial = getattr(self.model, 'status', 'IMPORTADO')
        if estado_inicial not in self.estados:
            estado_inicial = 'IMPORTADO' 

        self.machine = Machine(model=self.model, states=RecebimentoFSM.estados, initial=estado_inicial, model_attribute='status')

        self.machine.add_transition(trigger='marcar_pendente', source='IMPORTADO', dest='PENDENTE')
        self.machine.add_transition(trigger='bloquear', source=['IMPORTADO', 'PENDENTE'], dest='BLOQUEADO')
        self.machine.add_transition(trigger='desbloquear', source='BLOQUEADO', dest='IMPORTADO')
        self.machine.add_transition(trigger='preparar_para_liberar', source=['IMPORTADO', 'PENDENTE', 'BLOQUEADO'], dest='AGUARDANDO_LIBERACAO')
        self.machine.add_transition(trigger='regredir_para_pendente', source='AGUARDANDO_LIBERACAO', dest='PENDENTE')
        self.machine.add_transition(trigger='liberar_conferencia', source='AGUARDANDO_LIBERACAO', dest='AGUARDANDO_CONFERENCIA')
        self.machine.add_transition(trigger='iniciar_conferencia', source='AGUARDANDO_CONFERENCIA', dest='EM_CONFERENCIA')
        self.machine.add_transition(trigger='cancelar_conferencia', source=['AGUARDANDO_CONFERENCIA', 'EM_CONFERENCIA'], dest='AGUARDANDO_LIBERACAO')
        self.machine.add_transition(trigger='rejeitar', source='*', dest='REJEITADO', unless=['is_concluido'])
        self.machine.add_transition(trigger='concluir', source=['EM_CONFERENCIA', 'AGUARDANDO_CONFERENCIA'], dest='CONCLUIDO')

    def is_concluido(self):
        return self.model.status == 'CONCLUIDO'

# ========================================================

class RecebimentoItemFSM(object):
    estados = [
        'PENDENTE_VINCULO',
        'AGUARDANDO_LIBERACAO',
        'AGUARDANDO_CONFERENCIA',
        'EM_CONFERENCIA',
        'CONFERIDO',
        'DIVERGENTE'
    ]

    def __init__(self, item_model):
        self.model = item_model
        
        estado_inicial = getattr(self.model, 'status', 'PENDENTE_VINCULO')
        if estado_inicial not in self.estados:
            estado_inicial = 'PENDENTE_VINCULO' 

        self.machine = Machine(model=self.model, states=RecebimentoItemFSM.estados, initial=estado_inicial, model_attribute='status')

        self.machine.add_transition(trigger='vincular_sku', source='PENDENTE_VINCULO', dest='AGUARDANDO_LIBERACAO')
        self.machine.add_transition(trigger='desvincular_sku', source='AGUARDANDO_LIBERACAO', dest='PENDENTE_VINCULO')
        self.machine.add_transition(trigger='liberar', source='AGUARDANDO_LIBERACAO', dest='AGUARDANDO_CONFERENCIA')
        self.machine.add_transition(trigger='iniciar', source='AGUARDANDO_CONFERENCIA', dest='EM_CONFERENCIA')
        self.machine.add_transition(trigger='marcar_conferido', source=['AGUARDANDO_LIBERACAO', 'AGUARDANDO_CONFERENCIA', 'EM_CONFERENCIA'], dest='CONFERIDO')
        self.machine.add_transition(trigger='marcar_divergente', source=['AGUARDANDO_LIBERACAO', 'AGUARDANDO_CONFERENCIA', 'EM_CONFERENCIA'], dest='DIVERGENTE')
