import os
import sys
try:
    from PIL import Image
    import piexif
except ImportError:
    print("Dependências não encontradas. Execute: pip install Pillow piexif")
    sys.exit(1)

def get_utf16_bytes(text):
    """As tags XP do Windows (lidas por buscadores) exigem formato UTF-16LE."""
    return text.encode("utf-16le")

def processar_imagens():
    pasta_entrada = "images/originais"
    pasta_saida = "images/seo-ready"
    
    # Garante estrutura de pastas
    if not os.path.exists(pasta_entrada):
        os.makedirs(pasta_entrada)
        print(f"Pasta '{pasta_entrada}' criada. Mova as imagens para ela e rode o script novamente.")
        return
        
    if not os.path.exists(pasta_saida):
        os.makedirs(pasta_saida)
        
    arquivos = [f for f in os.listdir(pasta_entrada) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    if not arquivos:
        print(f"Nenhuma imagem JPG ou PNG encontrada na pasta '{pasta_entrada}'.")
        return
        
    # --- DADOS DE SEO LOCAL (Baseados no ESTRATEGIA_SEO_LOCAL.md) ---
    titulo = "Hortifruti Fuad - Pirituba e Lapa"
    descricao = "Hortifruti Fuad. Frutas, verduras e legumes frescos, selecionados diariamente no Ceasa. Atendemos Pirituba, Lapa e Freguesia do Ó."
    keywords = "hortifruti; pirituba; lapa; freguesia do o; frutas; legumes; verduras; atacado; fuad; saudavel"
    artista = "Hortifruti Fuad"
    
    # Criando o dicionário EXIF
    exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "Interop": {}}
    
    # Padrão EXIF
    exif_dict["0th"][piexif.ImageIFD.ImageDescription] = descricao.encode('utf-8')
    exif_dict["0th"][piexif.ImageIFD.Artist] = artista.encode('utf-8')
    exif_dict["0th"][piexif.ImageIFD.Software] = "SEO Optmizer Fuad".encode('utf-8')
    
    # Tags estendidas Windows (Excelentes para indexação do Google)
    exif_dict["0th"][40091] = get_utf16_bytes(titulo)     # XPTitle
    exif_dict["0th"][40092] = get_utf16_bytes(descricao)  # XPComment
    exif_dict["0th"][40094] = get_utf16_bytes(keywords)   # XPKeywords
    
    exif_bytes = piexif.dump(exif_dict)
    
    print("Iniciando otimização e injeção de SEO nas imagens...")
    
    for arquivo in arquivos:
        caminho_entrada = os.path.join(pasta_entrada, arquivo)
        nome_base = arquivo.rsplit('.', 1)[0]
        caminho_saida = os.path.join(pasta_saida, f"{nome_base}_fuad_pirituba.jpg")
        
        try:
            with Image.open(caminho_entrada) as img:
                # Converte para RGB para poder salvar como JPG (caso seja PNG)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                    
                # Redimensionar: Otimização p/ Maps (Máx 1080px mantendo proporção)
                img.thumbnail((1080, 1080), Image.Resampling.LANCZOS)
                
                # Salva com compressão de qualidade e anexa os metadados EXIF
                img.save(caminho_saida, "JPEG", quality=85, optimize=True, exif=exif_bytes)
                print(f"[OK] {arquivo} -> {caminho_saida}")
        except Exception as e:
            print(f"[ERRO] Falha ao processar {arquivo}: {e}")
            
    print(f"\nFinalizado! As imagens formatadas para o Maps estão na pasta: {pasta_saida}")

if __name__ == "__main__":
    processar_imagens()
