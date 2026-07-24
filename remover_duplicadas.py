import os
import sys
try:
    from PIL import Image
    import imagehash
except ImportError:
    print("Por favor, execute: pip install Pillow imagehash")
    sys.exit(1)

def remover_duplicadas_por_hash():
    pasta_entrada = r"c:\Users\Lazarete\Documents\Projetos\Web\Hortifruti\images\originais"
    
    arquivos = [f for f in os.listdir(pasta_entrada) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    hashes_encontrados = {} # dicionário com chave=hash : valor=(nome_arquivo, tamanho_bytes)
    arquivos_a_remover = []

    print(f"Analisando {len(arquivos)} imagens por similaridade visual (Perceptual Hash)...")

    for arquivo in arquivos:
        caminho_completo = os.path.join(pasta_entrada, arquivo)
        try:
            with Image.open(caminho_completo) as img:
                # phash (Perceptual Hash) analisa a estrutura visual da imagem
                h = imagehash.phash(img)
                tamanho = os.path.getsize(caminho_completo)
                
                # Procura por uma imagem com estrutura quase idêntica (distância <= 5 bits)
                hash_similar = None
                for he, (arq_existente, tam_existente) in hashes_encontrados.items():
                    # Subtrair dois hashes do imagehash resulta na distância de Hamming entre eles
                    if abs(h - he) <= 5: 
                        hash_similar = he
                        break
                        
                if hash_similar:
                    arq_existente, tam_existente = hashes_encontrados[hash_similar]
                    print(f"[*] Imagem redundante detectada: '{arquivo}' se parece com '{arq_existente}'.")
                    
                    # Como especialista em SEO e qualidade de imagem, escolhemos manter o arquivo de maior peso (menos comprimido)
                    if tamanho > tam_existente:
                        if arq_existente not in arquivos_a_remover:
                            arquivos_a_remover.append(arq_existente)
                        # Atualizamos o dicionário com a imagem de melhor resolução
                        hashes_encontrados[hash_similar] = (arquivo, tamanho) 
                        print(f"    -> Retendo a nova foto (maior resolução) e marcando '{arq_existente}' para remoção.")
                    else:
                        if arquivo not in arquivos_a_remover:
                            arquivos_a_remover.append(arquivo)
                        print(f"    -> Retendo a anterior (maior resolução) e marcando '{arquivo}' para remoção.")
                else:
                    hashes_encontrados[h] = (arquivo, tamanho)
        except Exception as e:
            print(f"[ERRO] Falha ao processar a visão computacional de {arquivo}: {e}")

    print(f"\n==========================================")
    print(f"Total de fotos únicas a serem retidas: {len(hashes_encontrados)}")
    print(f"Total de cópias redundantes a remover: {len(arquivos_a_remover)}")
    print(f"==========================================\n")
    
    # Processo de exclusão física das descartadas
    for arq_remov in arquivos_a_remover:
        caminho = os.path.join(pasta_entrada, arq_remov)
        if os.path.exists(caminho):
            try:
                os.remove(caminho)
                print(f"[X] Removida: {arq_remov}")
            except Exception as e:
                print(f"Erro ao tentar remover {arq_remov}: {e}")

if __name__ == '__main__':
    remover_duplicadas_por_hash()
